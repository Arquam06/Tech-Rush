import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { recordHistory } from '../services/historyService.js';
import { analyzeMeeting } from '../services/meetingAIService.js';

const router = Router();

const demoMeetings = [
  {
    id: 'm1111111-1111-1111-1111-111111111111',
    company_id: 'comp-demo-123',
    title: 'AI Workplace Sprint Alignment',
    description: 'Weekly team alignment and AI project risk assessment',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    duration_minutes: 45,
    status: 'scheduled',
    room_id: 'room-demo-123',
    meeting_participants: [],
  }
];

router.get('/', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, employees!meetings_host_id_fkey(first_name, last_name, avatar_url), meeting_participants(employee_id, employees(first_name, last_name, avatar_url))')
        .eq('company_id', req.companyId)
        .order('scheduled_at', { ascending: false });
      if (!error && data) return res.json(data);
    }
    res.json(demoMeetings);
  } catch {
    res.json(demoMeetings);
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('meetings')
        .select(`*,
          employees!meetings_host_id_fkey(id, first_name, last_name, avatar_url),
          meeting_participants(employee_id, employees(id, first_name, last_name, avatar_url)),
          meeting_transcripts(id, content, created_at),
          meeting_decisions(id, decision, created_at),
          meeting_action_items(id, title, description, owner_id, due_date, status, employees!meeting_action_items_owner_id_fkey(first_name, last_name))
        `)
        .eq('id', req.params.id)
        .single();
      if (!error && data) return res.json(data);
    }
    const found = demoMeetings.find(m => m.id === req.params.id) || demoMeetings[0];
    res.json(found);
  } catch {
    res.json(demoMeetings[0]);
  }
});

router.post('/', async (req, res) => {
  const { title, description, scheduledAt, duration } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const newMeeting = {
    id: `m_${Date.now()}`,
    company_id: req.companyId || 'comp-demo-123',
    host_id: req.employee?.id,
    title,
    description: description || '',
    scheduled_at: scheduledAt || new Date().toISOString(),
    duration_minutes: duration || 60,
    room_id: roomId,
    status: 'scheduled',
    meeting_participants: [],
  };
  demoMeetings.unshift(newMeeting);
  res.status(201).json(newMeeting);
});

router.patch('/:id', async (req, res) => {
  const allowed = ['status','title','description','scheduled_at'];
  const updates = { updated_at: new Date().toISOString() };
  for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
  res.json({ id: req.params.id, ...updates });
});

router.post('/:id/transcript', async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'Transcript required' });
  const analysis = await analyzeMeeting(transcript, req.params.id, req.companyId);
  res.json(analysis);
});

router.post('/:id/action-items', async (req, res) => {
  const { actionItems = [] } = req.body;
  res.status(201).json(actionItems);
});

export default router;
