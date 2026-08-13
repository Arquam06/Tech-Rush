import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { recordHistory } from '../services/historyService.js';
import { awardContributionPoints } from '../services/contributionService.js';

const router = Router();

const demoTasks = [
  {
    id: 'tk424242-4242-4242-4242-424242424242',
    company_id: 'comp-demo-123',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    assignee_id: 'emp-demo-123',
    title: 'Core Architecture Review',
    description: 'Review system architecture and service boundaries',
    status: 'in_progress',
    priority: 'high',
    complexity: 'high',
    estimated_hours: 8,
    due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
  }
];

// GET /api/tasks?projectId=&assigneeId=&status=
router.get('/', async (req, res, next) => {
  try {
    if (isSupabaseConfigured) {
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
      if (!error && data) return res.json(data);
    }
    let list = [...demoTasks];
    if (req.query.status) list = list.filter(t => t.status === req.query.status);
    res.json(list);
  } catch (err) {
    res.json(demoTasks);
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('tasks')
        .select(`*,
          employees!tasks_assignee_id_fkey(id, first_name, last_name, avatar_url, title),
          projects(id, title),
          task_dependencies(depends_on_id, tasks!task_dependencies_depends_on_id_fkey(id, title, status)),
          task_comments(id, content, created_at, employees(first_name, last_name, avatar_url))
        `)
        .eq('id', req.params.id)
        .single();
      if (!error && data) return res.json(data);
    }
    const found = demoTasks.find(t => t.id === req.params.id) || demoTasks[0];
    res.json(found);
  } catch (err) {
    res.json(demoTasks[0]);
  }
});

// POST /api/tasks
router.post('/', async (req, res, next) => {
  try {
    const { title, description, projectId, assigneeId, priority = 'medium', complexity = 'medium', estimatedHours, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const newTask = {
      id: `task_${Date.now()}`,
      company_id: req.companyId || 'comp-demo-123',
      project_id: projectId || null,
      assignee_id: assigneeId || req.employee?.id || null,
      created_by: req.employee?.id,
      title, description, priority, complexity,
      estimated_hours: estimatedHours || 4,
      due_date: dueDate || null,
      status: 'todo',
      employees: req.employee ? { id: req.employee.id, first_name: req.employee.first_name, last_name: req.employee.last_name } : null,
    };

    demoTasks.unshift(newTask);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('tasks').insert({
          company_id: req.companyId,
          project_id: projectId || null,
          assignee_id: assigneeId || null,
          created_by: req.employee?.id,
          title, description, priority, complexity,
          estimated_hours: estimatedHours || 4,
          due_date: dueDate || null,
          status: 'todo',
        });
      } catch (e) {}
    }

    res.status(201).json(newTask);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const taskIndex = demoTasks.findIndex(t => t.id === req.params.id);
    if (taskIndex !== -1) {
      const allowed = ['title','description','status','priority','complexity','assignee_id','due_date','estimated_hours'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) demoTasks[taskIndex][key] = req.body[key];
      }
      return res.json(demoTasks[taskIndex]);
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('tasks').update(req.body).eq('id', req.params.id).select().single();
      if (!error && data) return res.json(data);
    }
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    next(err);
  }
});

export default router;
