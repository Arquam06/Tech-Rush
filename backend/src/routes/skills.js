import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/employee/:employeeId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('employee_skills')
      .select('*, skill_evidence(*)')
      .eq('employee_id', req.params.employeeId)
      .eq('company_id', req.companyId);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { employeeId, skillName, proficiency, evidence } = req.body;
    const { data, error } = await supabase
      .from('employee_skills')
      .upsert({ employee_id: employeeId, company_id: req.companyId, skill_name: skillName, proficiency: proficiency || 50, updated_at: new Date().toISOString() }, { onConflict: 'employee_id,skill_name' })
      .select().single();
    if (error) throw error;
    if (evidence) {
      await supabase.from('skill_evidence').insert({ skill_id: data.id, description: evidence, company_id: req.companyId });
    }
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
