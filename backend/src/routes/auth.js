import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { recordHistory } from '../services/historyService.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, companyName, role = 'admin' } = req.body;

    if (!email || !password || !firstName || !lastName || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName, slug: companyName.toLowerCase().replace(/\s+/g, '-') })
      .select()
      .single();

    if (companyError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: companyError.message });
    }

    // Create employee profile
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .insert({
        user_id: authData.user.id,
        company_id: company.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
        is_active: true,
      })
      .select()
      .single();

    if (empError) return res.status(400).json({ error: empError.message });

    await recordHistory({
      companyId: company.id,
      employeeId: employee.id,
      action: 'employee_created',
      entityType: 'employee',
      entityId: employee.id,
      newState: { name: `${firstName} ${lastName}`, role: 'admin' },
      description: `Company "${companyName}" created. Admin user registered.`,
    });

    res.status(201).json({ message: 'Registration successful. Please log in.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });

    // Fetch employee profile
    const { data: employee } = await supabase
      .from('employees')
      .select('*, companies(name, id)')
      .eq('user_id', data.user.id)
      .single();

    res.json({
      session: data.session,
      user: data.user,
      employee,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.substring(7);
    await supabase.auth.admin.signOut(token);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const { data: employee } = await supabase
    .from('employees')
    .select('*, companies(name, id, slug), departments(name)')
    .eq('user_id', req.user.id)
    .single();

  res.json({ user: req.user, employee });
});

export default router;
