import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { recordHistory } from '../services/historyService.js';
import { computeTeamHealth } from '../services/teamHealthService.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*, team_members(employee_id, role, employees(id, first_name, last_name, avatar_url, title))')
      .eq('company_id', req.companyId)
      .order('name');
    if (error) throw error;

    const withHealth = await Promise.all((data || []).map(async (t) => {
      const health = await computeTeamHealth(t.id, req.companyId);
      return { ...t, health };
    }));

    res.json(withHealth);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*, team_members(employee_id, role, employees(id, first_name, last_name, avatar_url, title, employee_skills(*)))')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Team not found' });
    const health = await computeTeamHealth(req.params.id, req.companyId);
    res.json({ ...data, health });
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, description, leadId, members } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name required' });
    const { data: team, error } = await supabase
      .from('teams')
      .insert({ company_id: req.companyId, name, description, lead_id: leadId || null })
      .select().single();
    if (error) throw error;
    if (members?.length) {
      await supabase.from('team_members').insert(members.map(m => ({ team_id: team.id, employee_id: m.employeeId, role: m.role || 'member', company_id: req.companyId })));
    }
    await recordHistory({ companyId: req.companyId, actorId: req.employee?.id, action: 'team_created', entityType: 'team', entityId: team.id, newState: { name }, description: `Team "${name}" created.` });
    res.status(201).json(team);
  } catch (err) { next(err); }
});

export default router;
