import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  res.json([]);
});

router.patch('/:id/read', async (req, res) => {
  res.json({ success: true });
});

router.patch('/read-all', async (req, res) => {
  res.json({ success: true });
});

export default router;
