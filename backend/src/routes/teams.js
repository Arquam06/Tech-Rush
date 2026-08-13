import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { computeTeamHealth } from '../services/teamHealthService.js';

const router = Router();

const demoTeams = [
  {
    id: 't1111111-1111-1111-1111-111111111111',
    company_id: 'comp-demo-123',
    name: 'Team Alpha',
    description: 'Core platform & intelligence team',
    health: { score: 82, dimensions: { workload: 78, velocity: 85, alignment: 84 } },
    team_members: [],
  }
];

router.get('/', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('teams').select('*, team_members(employee_id, role, employees(id, first_name, last_name, avatar_url, title))').eq('company_id', req.companyId);
      if (!error && data) return res.json(data);
    }
    res.json(demoTeams);
  } catch {
    res.json(demoTeams);
  }
});

router.post('/', async (req, res) => {
  const { name, description } = req.body;
  const newTeam = {
    id: `team_${Date.now()}`,
    company_id: req.companyId || 'comp-demo-123',
    name: name || 'New Team',
    description: description || '',
    health: { score: 85, dimensions: { workload: 85 } },
    team_members: req.employee ? [{ employee_id: req.employee.id, employees: req.employee }] : [],
  };
  demoTeams.push(newTeam);
  res.status(201).json(newTeam);
});

export default router;
