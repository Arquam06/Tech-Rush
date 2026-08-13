import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('employee_id', req.employee?.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('employee_id', req.employee?.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('employee_id', req.employee?.id).eq('is_read', false);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
