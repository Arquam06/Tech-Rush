import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { recordHistory } from '../services/historyService.js';
import { computeProjectRisk } from '../services/riskService.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// In-memory fallback projects store for local non-Supabase mode
const demoProjects = [
  {
    id: 'p1111111-1111-1111-1111-111111111111',
    company_id: 'comp-demo-123',
    title: 'AI Platform Core',
    description: 'Next-gen enterprise workplace integration platform',
    status: 'active',
    priority: 'high',
    end_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    risk: { score: 35, level: 'low', factors: [] },
    project_members: [],
    tasks: [],
  }
];

// GET /api/projects
router.get('/', async (req, res, next) => {
  try {
    if (isSupabaseConfigured) {
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
    }
    res.json(demoProjects);
  } catch (err) {
    res.json(demoProjects);
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (isSupabaseConfigured) {
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
    }
    const found = demoProjects.find(p => p.id === req.params.id) || demoProjects[0];
    res.json(found);
  } catch (err) {
    res.json(demoProjects[0]);
  }
});

// POST /api/projects
router.post('/', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, priority = 'medium' } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const newProject = {
      id: `proj_${Date.now()}`,
      company_id: req.companyId || 'comp-demo-123',
      owner_id: req.employee?.id,
      title,
      description,
      start_date: startDate || new Date().toISOString(),
      end_date: endDate || null,
      priority,
      status: 'active',
      risk: { score: 10, level: 'low', factors: [] },
      project_members: req.employee ? [{ employee_id: req.employee.id, employees: req.employee }] : [],
      tasks: [],
    };

    demoProjects.unshift(newProject);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('projects').insert({
          company_id: req.companyId,
          owner_id: req.employee?.id,
          title, description,
          start_date: startDate,
          end_date: endDate,
          priority, status: 'active',
        });
      } catch (e) {}
    }

    res.status(201).json(newProject);
  } catch (err) {
    next(err);
  }
});

export default router;
