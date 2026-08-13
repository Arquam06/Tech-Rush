import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET company info
router.get('/company', requireRole('admin', 'hr'), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('companies').select('*').eq('id', req.companyId).single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// GET overview stats
router.get('/stats', requireRole('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const [employees, projects, tasks, meetings] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact' }).eq('company_id', req.companyId).eq('is_active', true),
      supabase.from('projects').select('id, status', { count: 'exact' }).eq('company_id', req.companyId),
      supabase.from('tasks').select('id, status', { count: 'exact' }).eq('company_id', req.companyId),
      supabase.from('meetings').select('id', { count: 'exact' }).eq('company_id', req.companyId),
    ]);
    const activeProjects = projects.data?.filter(p => p.status === 'active').length || 0;
    const doneTasks = tasks.data?.filter(t => t.status === 'done').length || 0;
    res.json({
      totalEmployees: employees.count || 0,
      totalProjects: projects.count || 0,
      activeProjects,
      totalTasks: tasks.count || 0,
      completedTasks: doneTasks,
      totalMeetings: meetings.count || 0,
    });
  } catch (err) { next(err); }
});

// POST rewards
router.post('/rewards', requireRole('admin', 'hr'), async (req, res, next) => {
  try {
    const { title, description, pointsRequired, category } = req.body;
    const { data, error } = await supabase.from('rewards').insert({ company_id: req.companyId, title, description, points_required: pointsRequired, category: category || 'recognition', is_active: true }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// POST departments
router.post('/departments', requireRole('admin', 'hr'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const { data, error } = await supabase.from('departments').insert({ company_id: req.companyId, name, description }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

router.get('/departments', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('departments').select('*').eq('company_id', req.companyId);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

export default router;
