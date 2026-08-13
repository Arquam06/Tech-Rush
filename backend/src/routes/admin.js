import { Router } from 'express';
import { userStore } from '../lib/userStore.js';

const router = Router();

router.get('/stats', async (req, res) => {
  const employees = userStore.getAllEmployees(req.companyId);
  res.json({
    totalEmployees: employees.length || 1,
    activeProjects: 1,
    totalTasks: 2,
    completedTasks: 1,
  });
});

router.get('/departments', async (req, res) => {
  res.json([
    { id: 'd1', name: 'Engineering', description: 'Development and AI engineering' },
    { id: 'd2', name: 'Operations', description: 'HR and business ops' },
  ]);
});

export default router;
