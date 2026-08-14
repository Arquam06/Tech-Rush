import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  company_id: { type: String, required: true },
  user_id: { type: String },
  email: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'hr', 'manager', 'employee'], default: 'employee' },
  title: { type: String, default: 'Team Member' },
  department: { type: String, default: 'Engineering' },
  avatar_url: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
