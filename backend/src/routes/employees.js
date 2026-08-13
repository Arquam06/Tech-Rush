import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { userStore } from '../lib/userStore.js';
import { recordHistory } from '../services/historyService.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/employees
router.get('/', async (req, res, next) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('employees')
        .select('*, departments(name), companies(name)')
        .eq('company_id', req.companyId)
        .eq('is_active', true)
        .order('first_name');
      if (!error && data) return res.json(data);
    }
    // Return employees from userStore (includes authenticated user)
    const list = userStore.getAllEmployees(req.companyId);
    if (req.employee && !list.find(e => e.id === req.employee.id)) {
      list.unshift(req.employee);
    }
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('employees')
        .select('*, departments(name), companies(name), employee_skills(*, skill_evidence(*))')
        .eq('id', req.params.id)
        .single();
      if (!error && data) return res.json(data);
    }
    const emp = userStore.getEmployeeById(req.params.id) || req.employee;
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    res.json(emp);
  } catch (err) {
    next(err);
  }
});

// POST /api/employees — invite/create employee
router.post('/', requireRole('admin', 'hr'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, departmentId, role = 'employee', title } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const saved = userStore.saveUser({
      email,
      password,
      firstName,
      lastName,
      companyId: req.companyId,
      companyName: req.employee?.companies?.name || 'My Company',
      role,
      title: title || 'Team Member',
    });

    if (isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
        if (authData?.user) {
          await supabase.from('employees').insert({
            user_id: authData.user.id,
            company_id: req.companyId,
            department_id: departmentId || null,
            email, first_name: firstName, last_name: lastName,
            role, title: title || null, is_active: true,
          });
        }
      } catch (e) {
        console.warn('Supabase employee creation sync notice:', e.message);
      }
    }

    res.status(201).json(saved.employee);
  } catch (err) {
    next(err);
  }
});

export default router;
