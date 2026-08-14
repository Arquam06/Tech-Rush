import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { connectDB, isMongoConfigured } from '../lib/db.js';
import Task from '../models/Task.js';
import { recordHistory } from '../services/historyService.js';
import { awardContributionPoints } from '../services/contributionService.js';
import { userStore } from '../lib/userStore.js';

const router = Router();

// GET /api/tasks?projectId=&assigneeId=&status=
router.get('/', async (req, res, next) => {
  try {
    const companyId = req.companyId || 'comp-default';
    const filter = {};
    if (req.query.projectId) filter.project_id = req.query.projectId;
    if (req.query.assigneeId) filter.assignee_id = req.query.assigneeId;
    if (req.query.status) filter.status = req.query.status;

    if (isMongoConfigured()) {
      await connectDB();
      const mongoTasks = await Task.find({ company_id: companyId, ...filter }).sort({ priority: -1, due_date: 1 });
      if (mongoTasks && mongoTasks.length > 0) {
        return res.json(mongoTasks);
      }
    }

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('tasks')
          .select(`*, employees!tasks_assignee_id_fkey(id, first_name, last_name, avatar_url), projects(id, title), task_dependencies(depends_on_id)`)
          .eq('company_id', companyId)
          .order('priority', { ascending: false })
          .order('due_date', { ascending: true, nullsFirst: false });

        if (req.query.projectId) query = query.eq('project_id', req.query.projectId);
        if (req.query.assigneeId) query = query.eq('assignee_id', req.query.assigneeId);
        if (req.query.status) query = query.eq('status', req.query.status);

        const { data, error } = await query;
        if (!error && data && data.length > 0) return res.json(data);
      } catch (err) {
        console.warn('⚠️ Supabase get tasks notice:', err.message);
      }
    }

    const tasks = userStore.getTasks(companyId, {
      projectId: req.query.projectId,
      assigneeId: req.query.assigneeId,
      status: req.query.status,
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const taskId = req.params.id;

    if (isMongoConfigured()) {
      await connectDB();
      const mongoTask = await Task.findOne({ id: taskId });
      if (mongoTask) return res.json(mongoTask);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select(`*,
            employees!tasks_assignee_id_fkey(id, first_name, last_name, avatar_url, title),
            projects(id, title),
            task_dependencies(depends_on_id, tasks!task_dependencies_depends_on_id_fkey(id, title, status)),
            task_comments(id, content, created_at, employees(first_name, last_name, avatar_url))
          `)
          .eq('id', taskId)
          .single();
        if (!error && data) return res.json(data);
      } catch (err) {
        console.warn('⚠️ Supabase get task by id notice:', err.message);
      }
    }

    const tasks = userStore.getTasks(req.companyId);
    const found = tasks.find(t => t.id === taskId);
    if (found) return res.json(found);

    return res.status(404).json({ error: 'Task not found' });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks
router.post('/', async (req, res, next) => {
  try {
    const { title, description, projectId, assigneeId, priority = 'medium', complexity = 'medium', estimatedHours, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      company_id: req.companyId || 'comp-default',
      project_id: projectId || null,
      assignee_id: assigneeId || req.employee?.id || null,
      created_by: req.employee?.id,
      title, description, priority, complexity,
      estimated_hours: estimatedHours || 4,
      due_date: dueDate || null,
      status: 'todo',
      employees: req.employee ? { id: req.employee.id, first_name: req.employee.first_name, last_name: req.employee.last_name } : null,
    };

    userStore.saveTask(newTask);

    if (isMongoConfigured()) {
      try {
        await connectDB();
        await Task.create(newTask);
      } catch (e) {
        console.warn('MongoDB task create notice:', e.message);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('tasks').insert({
          id: newTask.id,
          company_id: newTask.company_id,
          project_id: projectId || null,
          assignee_id: assigneeId || null,
          created_by: req.employee?.id,
          title, description, priority, complexity,
          estimated_hours: estimatedHours || 4,
          due_date: dueDate || null,
          status: 'todo',
        });
      } catch (e) {
        console.warn('⚠️ Supabase task insert exception:', e.message);
      }
    }

    res.status(201).json(newTask);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const tasks = userStore.getTasks(req.companyId);
    const existing = tasks.find(t => t.id === taskId);
    let updated = { ...existing, ...req.body, id: taskId };
    userStore.saveTask(updated);

    if (isMongoConfigured()) {
      try {
        await connectDB();
        await Task.findOneAndUpdate({ id: taskId }, { $set: req.body });
      } catch (e) {}
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('tasks').update(req.body).eq('id', taskId).select().single();
        if (!error && data) updated = data;
      } catch (e) {}
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const taskId = req.params.id;
    userStore.tasks = (userStore.tasks || []).filter(t => t.id !== taskId);
    userStore.saveToDisk();

    if (isMongoConfigured()) {
      try {
        await connectDB();
        await Task.deleteOne({ id: taskId });
      } catch (e) {}
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('tasks').delete().eq('id', taskId);
      } catch (e) {}
    }

    res.json({ message: 'Task deleted successfully', id: taskId });
  } catch (err) {
    next(err);
  }
});

export default router;
