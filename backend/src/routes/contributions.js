import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json([]);
});

router.get('/employee/:employeeId', async (req, res) => {
  res.json({ employee_id: req.params.employeeId, total_points: 250 });
});

router.get('/rewards', async (req, res) => {
  res.json([
    { id: 'r1', title: 'Performance Bonus', description: '$250 performance bonus card', points_required: 1000, category: 'financial' },
    { id: 'r2', title: 'Extra Paid Leave Day', description: '1 day additional paid leave', points_required: 1500, category: 'time_off' }
  ]);
});

export default router;
