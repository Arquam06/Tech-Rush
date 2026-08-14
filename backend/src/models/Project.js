import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  company_id: { type: String, required: true },
  owner_id: { type: String },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  start_date: { type: String, default: () => new Date().toISOString() },
  end_date: { type: String, default: null },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['active', 'completed', 'on_hold', 'archived'], default: 'active' },
  risk: { type: Object, default: { score: 15, level: 'low', factors: [] } },
  project_members: { type: Array, default: [] },
  tasks: { type: Array, default: [] },
}, { timestamps: true });

export default mongoose.models.Project || mongoose.model('Project', projectSchema);
