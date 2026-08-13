import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { recordHistory } from '../services/historyService.js';
import { awardContributionPoints } from '../services/contributionService.js';

const router = Router();

// GET /api/tasks?projectId=&assigneeId=&status=
router.get('/', async (req, res, next) => {
  try {
    let query = supabase
      .from('tasks')
      .select(`*, employees!tasks_assignee_id_fkey(id, first_name, last_name, avatar_url), projects(id, title), task_dependencies(depends_on_id)`)
      .eq('company_id', req.companyId)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false });

    if (req.query.projectId) query = query.eq('project_id', req.query.projectId);
    if (req.query.assigneeId) query = query.eq('assignee_id', req.query.assigneeId);
    if (req.query.status) query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`*,
        employees!tasks_assignee_id_fkey(id, first_name, last_name, avatar_url, title),
        projects(id, title),
        task_dependencies(depends_on_id, tasks!task_dependencies_depends_on_id_fkey(id, title, status)),
        task_comments(id, content, created_at, employees(first_name, last_name, avatar_url))
      `)
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Task not found' });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/tasks
router.post('/', async (req, res, next) => {
  try {
    const { title, description, projectId, assigneeId, priority = 'medium', complexity = 'medium', estimatedHours, dueDate, dependsOn } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        company_id: req.companyId,
        project_id: projectId || null,
        assignee_id: assigneeId || null,
        created_by: req.employee?.id,
        title, description, priority, complexity,
        estimated_hours: estimatedHours || 4,
        due_date: dueDate || null,
        status: 'todo',
      })
      .select()
      .single();
    if (error) throw error;

    // Add dependencies
    if (dependsOn?.length) {
      await supabase.from('task_dependencies').insert(
        dependsOn.map(depId => ({ task_id: task.id, depends_on_id: depId, company_id: req.companyId }))
      );
    }

    await recordHistory({
      companyId: req.companyId,
      actorId: req.employee?.id,
      action: 'task_created',
      entityType: 'task',
      entityId: task.id,
      newState: { title, priority, complexity, status: 'todo', assigneeId },
      description: `Task "${title}" created.`,
      projectId,
    });

    res.status(201).json(task);
  } catch (err) { next(err); }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { data: prev } = await supabase.from('tasks').select().eq('id', req.params.id).eq('company_id', req.companyId).single();
    if (!prev) return res.status(404).json({ error: 'Task not found' });

    const allowed = ['title','description','status','priority','complexity','assignee_id','due_date','estimated_hours','actual_hours','blocker_type','blocker_notes'];
    const updates = { updated_at: new Date().toISOString() };
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }

    // Set completed_at if transitioning to done
    if (updates.status === 'done' && prev.status !== 'done') {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase.from('tasks').update(updates).eq('id', req.params.id).eq('company_id', req.companyId).select().single();
    if (error) throw error;

    // Determine history action
    let action = 'task_updated';
    let description = `Task "${prev.title}" updated.`;
    if (updates.status === 'done' && prev.status !== 'done') {
      action = 'task_completed';
      description = `Task "${prev.title}" completed.`;
    } else if (updates.assignee_id && updates.assignee_id !== prev.assignee_id) {
      action = prev.assignee_id ? 'task_reassigned' : 'task_assigned';
      description = `Task "${prev.title}" reassigned.`;
    } else if (updates.status) {
      action = 'task_status_changed';
      description = `Task "${prev.title}" status changed to ${updates.status}.`;
    }

    await recordHistory({
      companyId: req.companyId,
      actorId: req.employee?.id,
      action,
      entityType: 'task',
      entityId: req.params.id,
      previousState: { status: prev.status, assignee_id: prev.assignee_id, priority: prev.priority },
      newState: updates,
      description,
      projectId: prev.project_id,
    });

    // Award points on completion
    if (updates.status === 'done' && prev.status !== 'done' && data.assignee_id) {
      await awardContributionPoints({
        companyId: req.companyId,
        employeeId: data.assignee_id,
        task: data,
        event: 'task_completed',
      });
    }

    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ task_id: req.params.id, employee_id: req.employee?.id, content, company_id: req.companyId })
      .select('*, employees(first_name, last_name, avatar_url)')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

export default router;
