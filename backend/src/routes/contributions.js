import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*, employees(id, first_name, last_name, avatar_url), contribution_events(*)')
      .eq('company_id', req.companyId)
      .order('total_points', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

router.get('/employee/:employeeId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*, contribution_events(*), rewards(*, reward_redemptions(*))')
      .eq('employee_id', req.params.employeeId)
      .eq('company_id', req.companyId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || { total_points: 0, contribution_events: [] });
  } catch (err) { next(err); }
});

router.get('/rewards', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('rewards').select('*').eq('company_id', req.companyId).eq('is_active', true).order('points_required');
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

export default router;
