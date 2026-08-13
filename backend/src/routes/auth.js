import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { userStore } from '../lib/userStore.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const email = req.body.email?.trim();
    const password = req.body.password;
    const firstName = req.body.firstName?.trim() || req.body.first_name?.trim() || (email ? email.split('@')[0] : 'User');
    const lastName = req.body.lastName?.trim() || req.body.last_name?.trim() || '';
    const companyName = req.body.companyName?.trim() || req.body.company_name?.trim() || req.body.company?.trim() || 'My Company';
    const role = req.body.role || 'admin';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Always store user in userStore for immediate backend session resolution
    const savedUser = userStore.saveUser({
      email,
      password,
      firstName,
      lastName,
      companyName,
      role,
    });

    if (isSupabaseConfigured) {
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (!authError && authData?.user) {
          const { data: company } = await supabase
            .from('companies')
            .insert({ name: companyName, slug: companyName.toLowerCase().replace(/\s+/g, '-') })
            .select()
            .single();

          if (company) {
            await supabase
              .from('employees')
              .insert({
                user_id: authData.user.id,
                company_id: company.id,
                email,
                first_name: firstName,
                last_name: lastName,
                role,
                is_active: true,
              });
          }
        }
      } catch (err) {
        console.warn('Supabase registration sync notice:', err.message);
      }
    }

    return res.status(201).json({
      message: 'Registration successful. Please log in.',
      user: { id: savedUser.id, email: savedUser.email },
      employee: savedUser.employee,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const email = req.body.email?.trim();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase();
    let user = userStore.getUserByEmail(cleanEmail);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data?.user) {
          const { data: emp } = await supabase
            .from('employees')
            .select('*, companies(name, id)')
            .eq('user_id', data.user.id)
            .single();

          if (emp) {
            userStore.saveUser({
              id: data.user.id,
              email,
              password,
              firstName: emp.first_name,
              lastName: emp.last_name,
              companyName: emp.companies?.name || 'My Company',
              companyId: emp.company_id,
              role: emp.role || 'admin',
              title: emp.title,
            });
            user = userStore.getUserByEmail(cleanEmail);
          }
        }
      } catch (err) {
        console.warn('Supabase login sync notice:', err.message);
      }
    }

    // Auto-create user if logging in for the first time without prior register (demo convenience)
    if (!user) {
      const parts = email.split('@')[0].split('.');
      const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'User';
      const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';
      user = userStore.saveUser({
        email,
        password,
        firstName,
        lastName,
        companyName: 'Acme AI Workspace',
        role: 'admin',
      });
    } else if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      companyName: user.companyName,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    console.log(`🔐 [Auth] User logged in: "${user.firstName} ${user.lastName}" <${user.email}> (${user.role})`);

    return res.json({
      token,
      session: { access_token: token, token_type: 'bearer' },
      user: { id: user.id, email: user.email },
      employee: user.employee,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  if (req.employee) {
    return res.json({ user: req.user, employee: req.employee });
  }
  return res.status(401).json({ error: 'Unauthorized: Profile not found' });
});

export default router;
