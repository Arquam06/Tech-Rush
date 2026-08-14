import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  company_id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  lead_id: { type: String, default: null },
  members: { type: Array, default: [] },
}, { timestamps: true });

export default mongoose.models.Team || mongoose.model('Team', teamSchema);
