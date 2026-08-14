import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { connectDB, isMongoConfigured } from '../lib/db.js';
import Meeting from '../models/Meeting.js';
import { recordHistory } from '../services/historyService.js';
import { analyzeMeeting } from '../services/meetingAIService.js';
import { userStore } from '../lib/userStore.js';

const router = Router();

// GET /api/meetings
router.get('/', async (req, res, next) => {
  try {
    const companyId = req.companyId || 'comp-default';

    if (isMongoConfigured()) {
      await connectDB();
      const mongoMeetings = await Meeting.find({ company_id: companyId }).sort({ scheduled_at: -1 });
      if (mongoMeetings && mongoMeetings.length > 0) {
        return res.json(mongoMeetings);
      }
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select('*, employees!meetings_host_id_fkey(first_name, last_name, avatar_url), meeting_participants(employee_id, employees(first_name, last_name, avatar_url))')
          .eq('company_id', companyId)
          .order('scheduled_at', { ascending: false });
        if (!error && data && data.length > 0) return res.json(data);
      } catch (err) {
        console.warn('Supabase get meetings notice:', err.message);
      }
    }

    const memoryMeetings = userStore.meetings || [];
    if (memoryMeetings.length > 0) {
      return res.json(memoryMeetings);
    }

    const defaultMeetings = [
      {
        id: 'm1111111-1111-1111-1111-111111111111',
        company_id: companyId,
        title: 'AI Workplace Sprint Alignment',
        description: 'Weekly team alignment and AI project risk assessment',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: 45,
        status: 'scheduled',
        room_id: 'room-demo-123',
        meeting_url: 'https://meet.jit.si/ai-workplace-sprint-alignment',
        meeting_participants: [],
      }
    ];

    res.json(defaultMeetings);
  } catch (err) {
    next(err);
  }
});

// GET /api/meetings/:id
router.get('/:id', async (req, res, next) => {
  try {
    const meetingId = req.params.id;

    if (isMongoConfigured()) {
      await connectDB();
      const foundMongo = await Meeting.findOne({ id: meetingId });
      if (foundMongo) return res.json(foundMongo);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select(`*,
            employees!meetings_host_id_fkey(id, first_name, last_name, avatar_url),
            meeting_participants(employee_id, employees(id, first_name, last_name, avatar_url)),
            meeting_transcripts(id, content, created_at),
            meeting_decisions(id, decision, created_at),
            meeting_action_items(id, title, description, owner_id, due_date, status, employees!meeting_action_items_owner_id_fkey(first_name, last_name))
          `)
          .eq('id', meetingId)
          .single();
        if (!error && data) return res.json(data);
      } catch (err) {}
    }

    const foundMemory = (userStore.meetings || []).find(m => m.id === meetingId);
    if (foundMemory) return res.json(foundMemory);

    if (meetingId === 'm1111111-1111-1111-1111-111111111111') {
      return res.json({
        id: 'm1111111-1111-1111-1111-111111111111',
        title: 'AI Workplace Sprint Alignment',
        description: 'Weekly team alignment and AI project risk assessment',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: 45,
        status: 'scheduled',
        room_id: 'room-demo-123',
        meeting_url: 'https://meet.jit.si/ai-workplace-sprint-alignment',
        meeting_participants: [],
      });
    }

    return res.status(404).json({ error: 'Meeting not found' });
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings
router.post('/', async (req, res, next) => {
  try {
    const { title, description, scheduledAt, duration, meetingUrl } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const uniqueMeetingUrl = meetingUrl || `https://meet.jit.si/ai-workplace-${roomId}`;
    const meetingId = `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const companyId = req.companyId || 'comp-default';

    const newMeeting = {
      id: meetingId,
      company_id: companyId,
      host_id: req.employee?.id || null,
      title,
      description: description || '',
      scheduled_at: scheduledAt || new Date().toISOString(),
      duration_minutes: duration || 60,
      room_id: roomId,
      meeting_url: uniqueMeetingUrl,
      status: 'scheduled',
      meeting_participants: req.employee ? [{ employee_id: req.employee.id, employees: req.employee }] : [],
      ai_summary: '',
      action_items: [],
      decisions: [],
      risks: [],
    };

    if (!userStore.meetings) userStore.meetings = [];
    userStore.meetings.unshift(newMeeting);
    userStore.saveToDisk();

    if (isMongoConfigured()) {
      try {
        await connectDB();
        await Meeting.create(newMeeting);
      } catch (e) {
        console.warn('MongoDB meeting save error:', e.message);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('meetings').insert({
          id: meetingId,
          company_id: companyId,
          host_id: req.employee?.id,
          title, description,
          scheduled_at: newMeeting.scheduled_at,
          duration_minutes: newMeeting.duration_minutes,
          room_id: roomId,
          status: 'scheduled',
        });
      } catch (e) {}
    }

    res.status(201).json(newMeeting);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/meetings/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const allowed = ['status', 'title', 'description', 'scheduled_at', 'meeting_url'];
    const updates = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (!userStore.meetings) userStore.meetings = [];
    const idx = userStore.meetings.findIndex(m => m.id === meetingId);
    if (idx !== -1) {
      userStore.meetings[idx] = { ...userStore.meetings[idx], ...updates };
      userStore.saveToDisk();
    }

    if (isMongoConfigured()) {
      try {
        await connectDB();
        await Meeting.findOneAndUpdate({ id: meetingId }, { $set: updates });
      } catch (e) {}
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('meetings').update(updates).eq('id', meetingId);
      } catch (e) {}
    }

    res.json({ id: meetingId, ...updates });
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings/:id/transcript
router.post('/:id/transcript', async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript required' });
    const analysis = await analyzeMeeting(transcript, req.params.id, req.companyId);
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings/:id/action-items
router.post('/:id/action-items', async (req, res, next) => {
  try {
    const { actionItems = [] } = req.body;
    res.status(201).json(actionItems);
  } catch (err) {
    next(err);
  }
});

export default router;
