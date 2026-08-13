import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { recordHistory } from '../services/historyService.js';
import { computeProjectRisk } from '../services/riskService.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/projects
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*, employees!projects_owner_id_fkey(first_name, last_name), project_members(employee_id, employees(first_name, last_name, avatar_url))')
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Compute risk for each project
    const withRisk = await Promise.all((data || []).map(async (p) => {
      const risk = await computeProjectRisk(p.id, req.companyId);
      return { ...p, risk };
    }));

    res.json(withRisk);
  } catch (err) { next(err); }
});

// GET /api/projects/:id
router.get('/:id', async (req, res, next) => {
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
      .eq('company_id', req.companyId)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Project not found' });

    const risk = await computeProjectRisk(req.params.id, req.companyId);
    res.json({ ...data, risk });
  } catch (err) { next(err); }
});

// POST /api/projects
router.post('/', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, priority = 'medium', members } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        company_id: req.companyId,
        owner_id: req.employee?.id,
        title, description,
        start_date: startDate,
        end_date: endDate,
        priority, status: 'active',
      })
      .select()
      .single();
    if (error) throw error;

    // Add members
    if (members?.length) {
      await supabase.from('project_members').insert(
        members.map(m => ({ project_id: project.id, employee_id: m.employeeId, role: m.role || 'member' }))
      );
    }

    // Add owner as member
    if (req.employee?.id) {
      await supabase.from('project_members').upsert({ project_id: project.id, employee_id: req.employee.id, role: 'lead' });
    }

    await recordHistory({
      companyId: req.companyId,
      actorId: req.employee?.id,
      action: 'project_created',
      entityType: 'project',
      entityId: project.id,
      newState: { title, status: 'active', priority },
      description: `Project "${title}" created.`,
    });

    res.status(201).json(project);
  } catch (err) { next(err); }
});

// PATCH /api/projects/:id
router.patch('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { data: prev } = await supabase.from('projects').select().eq('id', req.params.id).eq('company_id', req.companyId).single();
    if (!prev) return res.status(404).json({ error: 'Project not found' });

    const allowed = ['title','description','status','priority','end_date','start_date'];
    const updates = { updated_at: new Date().toISOString() };
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }

    const { data, error } = await supabase.from('projects').update(updates).eq('id', req.params.id).eq('company_id', req.companyId).select().single();
    if (error) throw error;

    await recordHistory({
      companyId: req.companyId,
      actorId: req.employee?.id,
      action: 'project_updated',
      entityType: 'project',
      entityId: req.params.id,
      previousState: prev,
      newState: updates,
      description: `Project "${prev.title}" updated.`,
    });

    res.json(data);
  } catch (err) { next(err); }
});

export default router;
