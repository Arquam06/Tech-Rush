import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { connectDB, isMongoConfigured } from '../lib/db.js';
import Team from '../models/Team.js';
import { userStore } from '../lib/userStore.js';

const router = Router();

// GET /api/teams
router.get('/', async (req, res, next) => {
  try {
    const companyId = req.companyId || 'comp-default';

    if (isMongoConfigured()) {
      await connectDB();
      const mongoTeams = await Team.find({ company_id: companyId });
      if (mongoTeams && mongoTeams.length > 0) return res.json(mongoTeams);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('teams').select('*, team_members(employee_id, role, employees(id, first_name, last_name, avatar_url, title))').eq('company_id', companyId);
        if (!error && data && data.length > 0) return res.json(data);
      } catch (e) {}
    }

    const memoryTeams = userStore.teams || [];
    if (memoryTeams.length > 0) return res.json(memoryTeams);

    const defaultTeams = [
      {
        id: 't1111111-1111-1111-1111-111111111111',
        company_id: companyId,
        name: 'Team Alpha',
        description: 'Core platform & intelligence team',
        health: { score: 82, dimensions: { workload: 78, velocity: 85, alignment: 84 } },
        team_members: [],
      }
    ];

    res.json(defaultTeams);
  } catch (err) {
    next(err);
  }
});

// POST /api/teams
router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name is required' });

    const companyId = req.companyId || 'comp-default';
    const newTeam = {
      id: `team_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      company_id: companyId,
      name,
      description: description || '',
      health: { score: 85, dimensions: { workload: 85 } },
      team_members: req.employee ? [{ employee_id: req.employee.id, employees: req.employee }] : [],
    };

    if (!userStore.teams) userStore.teams = [];
    userStore.teams.push(newTeam);
    userStore.saveToDisk();

    if (isMongoConfigured()) {
      try {
        await connectDB();
        await Team.create(newTeam);
      } catch (e) {}
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('teams').insert({
          id: newTeam.id,
          company_id: companyId,
          name,
          description: description || '',
        });
      } catch (e) {}
    }

    res.status(201).json(newTeam);
  } catch (err) {
    next(err);
  }
});

export default router;
