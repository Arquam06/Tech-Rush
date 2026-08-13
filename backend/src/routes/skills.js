import { Router } from 'express';

const router = Router();

router.get('/employee/:employeeId', async (req, res) => {
  res.json([
    { id: 'sk1', skill_name: 'Full Stack Development', proficiency: 90 },
    { id: 'sk2', skill_name: 'AI Engineering', proficiency: 85 }
  ]);
});

export default router;
