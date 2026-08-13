import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    // Verify with Supabase — validates the JWT issued by Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Fetch employee profile for role and company info
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, company_id, department_id, role, first_name, last_name, email, avatar_url, is_active')
      .eq('user_id', user.id)
      .single();

    if (empError && empError.code !== 'PGRST116') {
      console.error('Employee lookup error:', empError);
    }

    req.user = user;
    req.employee = employee || null;
    req.companyId = employee?.company_id || null;
    req.role = employee?.role || 'employee';
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
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
