import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { connectDB, isMongoConfigured } from '../lib/db.js';
import Employee from '../models/Employee.js';
import { userStore } from '../lib/userStore.js';
import { recordHistory } from '../services/historyService.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/employees
router.get('/', async (req, res, next) => {
  try {
    const companyId = req.companyId || 'comp-default';

    if (isMongoConfigured()) {
      await connectDB();
      const mongoEmps = await Employee.find({ company_id: companyId, is_active: true }).sort({ first_name: 1 });
      if (mongoEmps && mongoEmps.length > 0) return res.json(mongoEmps);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*, departments(name), companies(name)')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('first_name');
        if (!error && data && data.length > 0) return res.json(data);
      } catch (err) {
        console.warn('Supabase get employees notice:', err.message);
      }
    }

    const list = userStore.getAllEmployees(companyId);
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
    const empId = req.params.id;

    if (isMongoConfigured()) {
      await connectDB();
      const mongoEmp = await Employee.findOne({ id: empId });
      if (mongoEmp) return res.json(mongoEmp);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*, departments(name), companies(name), employee_skills(*, skill_evidence(*))')
          .eq('id', empId)
          .single();
        if (!error && data) return res.json(data);
      } catch (err) {}
    }

    const emp = userStore.getEmployeeById(empId) || req.employee;
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    res.json(emp);
  } catch (err) {
    next(err);
  }
});

// POST /api/employees — invite/create employee
router.post('/', requireRole('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, departmentId, role = 'employee', title } = req.body;
    if (!email || !firstName) {
      return res.status(400).json({ error: 'Email and first name are required' });
    }

    const saved = userStore.saveUser({
      email,
      password: password || 'Password123!',
      firstName,
      lastName: lastName || '',
      companyId: req.companyId,
      companyName: req.employee?.companies?.name || 'My Company',
      role,
      title: title || 'Team Member',
    });

    if (isMongoConfigured()) {
      try {
        await connectDB();
        await Employee.create({
          id: saved.employee.id,
          company_id: req.companyId || 'comp-default',
          user_id: saved.id,
          email,
          first_name: firstName,
          last_name: lastName || '',
          role,
          title: title || 'Team Member',
          is_active: true,
        });
      } catch (e) {}
    }

    if (isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.admin.createUser({ email, password: password || 'Password123!', email_confirm: true });
        if (authData?.user) {
          await supabase.from('employees').insert({
            user_id: authData.user.id,
            company_id: req.companyId,
            department_id: departmentId || null,
            email, first_name: firstName, last_name: lastName || '',
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
