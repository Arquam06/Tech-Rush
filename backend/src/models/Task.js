import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  company_id: { type: String, required: true },
  project_id: { type: String },
  assignee_id: { type: String },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  complexity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  due_date: { type: String, default: null },
  estimated_hours: { type: Number, default: 4 },
  blocker_type: { type: String, default: null },
}, { timestamps: true });

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
