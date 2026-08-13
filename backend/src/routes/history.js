import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, entityType, entityId, projectId } = req.query;
    let query = supabase
      .from('audit_logs')
      .select('*, employees!audit_logs_actor_id_fkey(first_name, last_name, avatar_url)', { count: 'exact' })
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    if (projectId) query = query.eq('project_id', projectId);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data: data || [], total: count, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
});

export default router;
