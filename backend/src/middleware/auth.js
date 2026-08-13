import jwt from 'jsonwebtoken';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { userStore } from '../lib/userStore.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    if (isSupabaseConfigured) {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id, company_id, department_id, role, first_name, last_name, email, avatar_url, is_active, companies(id, name)')
          .eq('user_id', user.id)
          .single();

        if (employee) {
          req.user = user;
          req.employee = employee;
          req.companyId = employee.company_id;
          req.role = employee.role || 'employee';
          return next();
        }
      }
    }

    // Verify local JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    // Look up exact stored user record from userStore
    let storedUser = userStore.getUserById(decoded.id) || userStore.getUserByEmail(decoded.email);

    if (storedUser) {
      req.user = { id: storedUser.id, email: storedUser.email };
      req.employee = storedUser.employee;
      req.companyId = storedUser.companyId;
      req.role = storedUser.role;
      return next();
    }

    // Reconstruct user profile dynamically from JWT payload claims (never use hardcoded demo values!)
    const firstName = decoded.firstName || (decoded.email ? decoded.email.split('@')[0] : 'User');
    const lastName = decoded.lastName || '';
    const companyName = decoded.companyName || 'My Company';
    const companyId = decoded.companyId || 'comp-default';
    const role = decoded.role || 'admin';

    req.user = { id: decoded.id, email: decoded.email };
    req.employee = {
      id: `emp_${decoded.id}`,
      company_id: companyId,
      user_id: decoded.id,
      email: decoded.email,
      first_name: firstName,
      last_name: lastName,
      role: role,
      title: role === 'admin' ? 'Administrator' : 'Team Member',
      companies: { id: companyId, name: companyName },
    };
    req.companyId = companyId;
    req.role = role;
    next();
  } catch (err) {
    console.warn('Auth token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.role || !roles.includes(req.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}
