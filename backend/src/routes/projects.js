import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { connectDB, isMongoConfigured } from '../lib/db.js';
import Project from '../models/Project.js';
import { recordHistory } from '../services/historyService.js';
import { computeProjectRisk } from '../services/riskService.js';
import { requireRole } from '../middleware/auth.js';
import { userStore } from '../lib/userStore.js';

const router = Router();

// GET /api/projects
router.get('/', async (req, res, next) => {
  try {
    const companyId = req.companyId || 'comp-default';

    if (isMongoConfigured()) {
      await connectDB();
      const mongoProjects = await Project.find({ company_id: companyId }).sort({ createdAt: -1 });
      if (mongoProjects && mongoProjects.length > 0) {
        return res.json(mongoProjects);
      }
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, employees!projects_owner_id_fkey(first_name, last_name), project_members(employee_id, employees(first_name, last_name, avatar_url))')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          const withRisk = await Promise.all(data.map(async (p) => {
            const risk = await computeProjectRisk(p.id, companyId);
            return { ...p, risk };
          }));
          return res.json(withRisk);
        }
      } catch (err) {
        console.warn('⚠️ Supabase get projects notice:', err.message);
      }
    }

    const projects = userStore.getProjects(companyId);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const companyId = req.companyId || 'comp-default';

    if (isMongoConfigured()) {
      await connectDB();
      const mongoProj = await Project.findOne({ id: projectId });
      if (mongoProj) return res.json(mongoProj);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            employees!projects_owner_id_fkey(id, first_name, last_name, avatar_url),
            project_members(employee_id, role, employees(id, first_name, last_name, avatar_url, title)),
            tasks(id, title, status, priority, complexity, assignee_id, due_date, estimated_hours,
              employees!tasks_assignee_id_fkey(first_name, last_name, avatar_url)),
            project_risks(id, description, severity, status, created_at)
          `)
          .eq('id', projectId)
          .single();
        if (!error && data) {
          const risk = await computeProjectRisk(projectId, companyId);
          return res.json({ ...data, risk });
        }
      } catch (err) {
        console.warn('⚠️ Supabase get project by id notice:', err.message);
      }
    }

    const projects = userStore.getProjects(companyId);
    const found = projects.find(p => p.id === projectId);
    if (found) return res.json(found);

    return res.status(404).json({ error: 'Project not found' });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects
router.post('/', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, priority = 'medium' } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const newProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      company_id: req.companyId || 'comp-default',
      owner_id: req.employee?.id || null,
      title,
      description: description || '',
      start_date: startDate || new Date().toISOString(),
      end_date: endDate || null,
      priority,
      status: 'active',
      risk: { score: 15, level: 'low', factors: [] },
      project_members: req.employee ? [{ employee_id: req.employee.id, employees: req.employee }] : [],
      tasks: [],
    };

    userStore.saveProject(newProject);

    if (isMongoConfigured()) {
      try {
        await connectDB();
        await Project.create(newProject);
      } catch (e) {
        console.warn('MongoDB project create notice:', e.message);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('projects').insert({
          id: newProject.id,
          company_id: newProject.company_id,
          owner_id: req.employee?.id,
          title, description,
          start_date: newProject.start_date,
          end_date: endDate,
          priority, status: 'active',
        });
      } catch (e) {
        console.warn('⚠️ Supabase project insert exception:', e.message);
      }
    }

    res.status(201).json(newProject);
  } catch (err) {
    next(err);
  }
});

// PUT & PATCH /api/projects/:id
const updateProjectHandler = async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'status', 'priority', 'end_date', 'start_date'];
    const updates = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const projects = userStore.getProjects(req.companyId);
    const existing = projects.find(p => p.id === req.params.id);
    let updated = { ...existing, ...updates, id: req.params.id };
    userStore.saveProject(updated);

    if (isMongoConfigured()) {
      try {
        await connectDB();
        await Project.findOneAndUpdate({ id: req.params.id }, { $set: updates });
      } catch (e) {}
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('projects').update(updates).eq('id', req.params.id).select().single();
        if (!error && data) updated = data;
      } catch (e) {}
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

router.put('/:id', requireRole('admin', 'manager'), updateProjectHandler);
router.patch('/:id', requireRole('admin', 'manager'), updateProjectHandler);

// DELETE /api/projects/:id
router.delete('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    userStore.projects = userStore.projects.filter(p => p.id !== req.params.id);
    userStore.saveToDisk();

    if (isMongoConfigured()) {
      try {
        await connectDB();
        await Project.deleteOne({ id: req.params.id });
      } catch (e) {}
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('projects').delete().eq('id', req.params.id);
      } catch (e) {}
    }

    res.json({ message: 'Project deleted successfully', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
