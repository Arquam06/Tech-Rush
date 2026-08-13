import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { recordHistory } from '../services/historyService.js';
import { analyzeMeeting } from '../services/meetingAIService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*, employees!meetings_host_id_fkey(first_name, last_name, avatar_url), meeting_participants(employee_id, employees(first_name, last_name, avatar_url))')
      .eq('company_id', req.companyId)
      .order('scheduled_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
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
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Meeting not found' });
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description, scheduledAt, duration, projectId, participants } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({ company_id: req.companyId, host_id: req.employee?.id, title, description, scheduled_at: scheduledAt, duration_minutes: duration || 60, project_id: projectId || null, room_id: roomId, status: 'scheduled' })
      .select().single();
    if (error) throw error;
    if (participants?.length) {
      await supabase.from('meeting_participants').insert(participants.map(id => ({ meeting_id: meeting.id, employee_id: id, company_id: req.companyId })));
    }
    await recordHistory({ companyId: req.companyId, actorId: req.employee?.id, action: 'meeting_created', entityType: 'meeting', entityId: meeting.id, newState: { title }, description: `Meeting "${title}" scheduled.` });
    res.status(201).json(meeting);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['status','title','description','scheduled_at'];
    const updates = { updated_at: new Date().toISOString() };
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
    const { data, error } = await supabase.from('meetings').update(updates).eq('id', req.params.id).eq('company_id', req.companyId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/meetings/:id/transcript — submit meeting transcript for AI analysis
router.post('/:id/transcript', async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript required' });
    // Save transcript
    await supabase.from('meeting_transcripts').insert({ meeting_id: req.params.id, content: transcript, company_id: req.companyId });
    // AI analysis
    const analysis = await analyzeMeeting(transcript, req.params.id, req.companyId);
    await recordHistory({ companyId: req.companyId, actorId: req.employee?.id, action: 'meeting_completed', entityType: 'meeting', entityId: req.params.id, description: `Meeting transcript processed. AI extracted ${analysis.decisions?.length || 0} decisions and ${analysis.actionItems?.length || 0} action items.` });
    res.json(analysis);
  } catch (err) { next(err); }
});

// POST /api/meetings/:id/action-items — confirm and save AI-proposed action items as tasks
router.post('/:id/action-items', async (req, res, next) => {
  try {
    const { actionItems } = req.body;
    const results = [];
    for (const item of actionItems) {
      const { data: ai, error } = await supabase.from('meeting_action_items').insert({ meeting_id: req.params.id, title: item.title, description: item.description, owner_id: item.ownerId || null, due_date: item.dueDate || null, status: 'open', company_id: req.companyId }).select().single();
      if (!error) results.push(ai);
      // Also create task if projectId provided
      if (item.projectId) {
        await supabase.from('tasks').insert({ company_id: req.companyId, project_id: item.projectId, assignee_id: item.ownerId || null, created_by: req.employee?.id, title: item.title, description: item.description, priority: 'medium', complexity: 'medium', estimated_hours: item.estimatedHours || 4, due_date: item.dueDate || null, status: 'todo' });
      }
    }
    res.status(201).json(results);
  } catch (err) { next(err); }
});

export default router;
