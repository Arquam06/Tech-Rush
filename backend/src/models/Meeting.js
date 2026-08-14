import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  company_id: { type: String, required: true },
  host_id: { type: String },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  scheduled_at: { type: String, default: () => new Date().toISOString() },
  duration_minutes: { type: Number, default: 60 },
  room_id: { type: String, required: true },
  meeting_url: { type: String, required: true },
  status: { type: String, enum: ['scheduled', 'live', 'completed', 'cancelled'], default: 'scheduled' },
  meeting_participants: { type: Array, default: [] },
  ai_summary: { type: String, default: '' },
  action_items: { type: Array, default: [] },
  decisions: { type: Array, default: [] },
  risks: { type: Array, default: [] },
}, { timestamps: true });

export default mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);
