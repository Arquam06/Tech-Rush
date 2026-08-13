import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const router = Router();

const demoLogs = [
  {
    id: 'log-1',
    company_id: 'comp-demo-123',
    action: 'employee_created',
    entity_type: 'employee',
    description: 'System workspace initialized.',
    created_at: new Date().toISOString(),
  }
];

router.get('/', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error, count } = await supabase
        .from('audit_logs')
        .select('*, employees!audit_logs_actor_id_fkey(first_name, last_name, avatar_url)', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (!error && data) return res.json({ data, total: count || data.length, page: 1, limit: 50 });
    }
    res.json({ data: demoLogs, total: demoLogs.length, page: 1, limit: 50 });
  } catch {
    res.json({ data: demoLogs, total: demoLogs.length, page: 1, limit: 50 });
  }
});

export default router;
