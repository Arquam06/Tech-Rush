import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { recordHistory } from '../services/historyService.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/employees
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*, departments(name), companies(name)')
      .eq('company_id', req.companyId)
      .eq('is_active', true)
      .order('first_name');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/employees/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*, departments(name), companies(name), employee_skills(*, skill_evidence(*))')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Employee not found' });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/employees — invite/create employee
router.post('/', requireRole('admin', 'hr'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, departmentId, role = 'employee', title, skills } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true
    });
    if (authError) return res.status(400).json({ error: authError.message });

    const { data: employee, error } = await supabase
      .from('employees')
      .insert({
        user_id: authData.user.id,
        company_id: req.companyId,
        department_id: departmentId || null,
        email, first_name: firstName, last_name: lastName,
        role, title: title || null, is_active: true,
      })
      .select()
      .single();
    if (error) throw error;

    await recordHistory({
      companyId: req.companyId,
      actorId: req.employee?.id,
      action: 'employee_created',
      entityType: 'employee',
      entityId: employee.id,
      newState: { name: `${firstName} ${lastName}`, role, email },
      description: `Employee ${firstName} ${lastName} added to company.`,
    });

    res.status(201).json(employee);
  } catch (err) { next(err); }
});

// PATCH /api/employees/:id
router.patch('/:id', requireRole('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const { data: prev } = await supabase.from('employees').select().eq('id', req.params.id).eq('company_id', req.companyId).single();
    if (!prev) return res.status(404).json({ error: 'Employee not found' });

    const allowed = ['first_name','last_name','title','department_id','role','workload_capacity','avatar_url'];
    const updates = {};
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('employees').update(updates).eq('id', req.params.id).eq('company_id', req.companyId).select().single();
    if (error) throw error;

    await recordHistory({
      companyId: req.companyId,
      actorId: req.employee?.id,
      action: 'employee_updated',
      entityType: 'employee',
      entityId: req.params.id,
      previousState: prev,
      newState: updates,
      description: `Employee profile updated.`,
    });

    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/employees/:id/workload
router.get('/:id/workload', async (req, res, next) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, priority, complexity, estimated_hours, due_date, status')
      .eq('assignee_id', req.params.id)
      .in('status', ['todo', 'in_progress'])
      .eq('company_id', req.companyId);
    if (error) throw error;

    const workload = calculateWorkload(tasks || []);
    res.json({ tasks, workload });
  } catch (err) { next(err); }
});

function calculateWorkload(tasks) {
  if (!tasks.length) return 0;
  const now = new Date();
  let totalScore = 0;
  for (const task of tasks) {
    let score = 0;
    // Base from estimated hours (normalized to 40hr week)
    score += Math.min((task.estimated_hours || 4) / 40 * 40, 40);
    // Priority multiplier
    const pMult = { critical: 2.0, high: 1.5, medium: 1.0, low: 0.7 }[task.priority] || 1.0;
    score *= pMult;
    // Complexity
    const cMult = { high: 1.4, medium: 1.0, low: 0.7 }[task.complexity] || 1.0;
    score *= cMult;
    // Deadline urgency
    if (task.due_date) {
      const daysLeft = (new Date(task.due_date) - now) / (1000 * 60 * 60 * 24);
      if (daysLeft < 1) score *= 1.8;
      else if (daysLeft < 3) score *= 1.4;
      else if (daysLeft < 7) score *= 1.2;
    }
    totalScore += score;
  }
  return Math.min(Math.round(totalScore), 100);
}

export default router;
