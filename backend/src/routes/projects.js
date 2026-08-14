import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { recordHistory } from '../services/historyService.js';
import { computeProjectRisk } from '../services/riskService.js';
import { requireRole } from '../middleware/auth.js';
import { userStore } from '../lib/userStore.js';

const router = Router();

// GET /api/projects
router.get('/', async (req, res, next) => {
  try {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, employees!projects_owner_id_fkey(first_name, last_name), project_members(employee_id, employees(first_name, last_name, avatar_url))')
          .eq('company_id', req.companyId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          const withRisk = await Promise.all(data.map(async (p) => {
            const risk = await computeProjectRisk(p.id, req.companyId);
            return { ...p, risk };
          }));
          return res.json(withRisk);
        }
      } catch (err) {
        console.warn('⚠️ Supabase get projects notice:', err.message);
      }
    }
    const projects = userStore.getProjects(req.companyId);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res, next) => {
  try {
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
          .eq('id', req.params.id)
          .single();
        if (!error && data) {
          const risk = await computeProjectRisk(req.params.id, req.companyId);
          return res.json({ ...data, risk });
        }
      } catch (err) {
        console.warn('⚠️ Supabase get project by id notice:', err.message);
      }
    }
    const projects = userStore.getProjects(req.companyId);
    const found = projects.find(p => p.id === req.params.id) || projects[0] || {
      id: req.params.id,
      title: 'Default Project',
      status: 'active',
      priority: 'medium',
      risk: { score: 15, level: 'low' },
      project_members: [],
      tasks: [],
    };
    res.json(found);
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
      owner_id: req.employee?.id,
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

    if (isSupabaseConfigured) {
      try {
        const { data: inserted, error } = await supabase.from('projects').insert({
          company_id: req.companyId,
          owner_id: req.employee?.id,
          title, description,
          start_date: startDate,
          end_date: endDate,
          priority, status: 'active',
        }).select().single();

        if (error) {
          console.error('❌ Supabase project insert error:', error.message);
        } else if (inserted) {
          console.log('✅ [Supabase] Project inserted:', inserted.title);
        }
      } catch (e) {
        console.warn('⚠️ Supabase project insert exception:', e.message);
      }
    }

    res.status(201).json(newProject);
  } catch (err) {
    next(err);
  }
});

export default router;
