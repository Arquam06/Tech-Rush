import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Plus, RefreshCw, Bot, ChevronLeft, CheckSquare, Users, Clock, GitBranch, CheckCircle, XCircle } from 'lucide-react'
import api from '../../lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showAddTask, setShowAddTask] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'medium', complexity: 'medium', estimatedHours: '4', dueDate: '' })
  const [recoveryPlan, setRecoveryPlan] = useState<any>(null)
  const [simResult, setSimResult] = useState<any>(null)
  const [genLoading, setGenLoading] = useState(false)

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data)
  })

  const createTask = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); setShowAddTask(false); setTaskForm({ title: '', priority: 'medium', complexity: 'medium', estimatedHours: '4', dueDate: '' }); toast.success('Task created!') }
  })

  const generateRecovery = async () => {
    setGenLoading(true)
    try {
      const res = await api.post('/ai/recovery-plan', { projectId: id })
      setRecoveryPlan(res.data)
    } catch (err) {
      toast.error('AI service unavailable')
    } finally { setGenLoading(false) }
  }

  const applyRecovery = async () => {
    if (!recoveryPlan) return
    try {
      await api.post('/ai/apply-action', { decisionId: recoveryPlan.decisionId, actions: recoveryPlan.plan?.actions || [] })
      toast.success('Recovery plan applied!')
      qc.invalidateQueries({ queryKey: ['project', id] })
      setRecoveryPlan(null)
    } catch { toast.error('Failed to apply plan') }
  }

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}><div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', margin: '0 auto' }} /></div>
  if (!project) return <div className="empty-state"><AlertTriangle size={36} /><p>Project not found</p></div>

  const tasks = project.tasks || []
  const members = project.project_members || []
  const done = tasks.filter((t: any) => t.status === 'done').length
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Back + Header */}
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: '12px' }}>
          <ChevronLeft size={14} /> Projects
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>{project.title}</h1>
            {project.description && <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{project.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {project.risk?.score >= 45 && (
              <button className="btn btn-danger btn-sm" onClick={generateRecovery} disabled={genLoading}>
                <RefreshCw size={13} /> {genLoading ? 'Analyzing...' : 'Recovery Plan'}
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(true)}>
              <Plus size={13} /> Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Risk Banner */}
      {project.risk?.score >= 45 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <AlertTriangle size={18} color="var(--color-danger)" />
            <span style={{ fontWeight: 600, color: 'var(--color-danger)' }}>Project At Risk — {project.risk.score}% Risk Score</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {project.risk.factors?.map((f: any, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: f.severity === 'critical' ? 'var(--color-danger)' : f.severity === 'high' ? 'var(--color-warning)' : 'var(--color-info)' }}>•</span>
                {f.factor} <span style={{ color: 'var(--color-text-muted)' }}>(impact: {f.impact})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recovery Plan Panel */}
      {recoveryPlan && (
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-accent)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '12px', color: 'var(--color-primary-light)' }}>
            🤖 AI Recovery Plan
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>{recoveryPlan.plan?.summary}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '12px', background: 'var(--color-danger-bg)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-danger)' }}>{recoveryPlan.currentRisk?.score}%</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Current Risk</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--color-success-bg)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-success)' }}>{recoveryPlan.plan?.estimatedNewRisk}%</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>After Recovery</div>
            </div>
          </div>
          {recoveryPlan.plan?.actions?.map((a: any, i: number) => (
            <div key={i} style={{ padding: '10px', background: 'var(--color-bg-elevated)', borderRadius: '8px', marginBottom: '6px' }}>
              <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'capitalize', marginBottom: '2px' }}>{a.type}: {a.description}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{a.reason}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={applyRecovery}><CheckCircle size={14} /> Apply Recovery Plan</button>
            <button className="btn btn-secondary" onClick={() => setRecoveryPlan(null)}><XCircle size={14} /> Dismiss</button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        {[{ label: 'Total Tasks', value: tasks.length, icon: <CheckSquare size={16} />, color: '#6366f1' }, { label: 'Completed', value: done, icon: <CheckCircle size={16} />, color: '#10b981' }, { label: 'Members', value: members.length, icon: <Users size={16} />, color: '#06b6d4' }, { label: 'Risk Score', value: `${project.risk?.score || 0}%`, icon: <AlertTriangle size={16} />, color: project.risk?.score >= 45 ? '#ef4444' : '#10b981' }].map((s, i) => (
          <div key={i} className="stat-card">
            <div style={{ color: s.color, marginBottom: '8px' }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>Overall Progress</span>
          <span style={{ fontSize: '13px', color: 'var(--color-primary-light)', fontWeight: 600 }}>{progress}%</span>
        </div>
        <div className="progress-bar" style={{ height: '10px' }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Tasks table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: '14px' }}>Tasks</div>
        <div className="table-container" style={{ borderRadius: '0 0 12px 12px', border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td>
                    {t.employees ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="avatar avatar-sm">{t.employees.first_name?.[0]}{t.employees.last_name?.[0]}</div>
                        <span>{t.employees.first_name} {t.employees.last_name}</span>
                      </div>
                    ) : <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>}
                  </td>
                  <td><span className={`badge badge-${t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : t.priority === 'medium' ? 'primary' : 'muted'}`}>{t.priority}</span></td>
                  <td><span className={`badge badge-${t.status === 'done' ? 'success' : t.status === 'in_progress' ? 'info' : t.status === 'blocked' ? 'danger' : 'muted'}`}>{t.status}</span></td>
                  <td style={{ color: t.due_date && new Date(t.due_date) < new Date() ? 'var(--color-danger)' : 'var(--color-text-secondary)', fontSize: '12px' }}>{t.due_date ? format(new Date(t.due_date), 'MMM d') : '—'}</td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>No tasks yet. Add your first task.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Task</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddTask(false)}>✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createTask.mutate({ title: taskForm.title, priority: taskForm.priority, complexity: taskForm.complexity, estimatedHours: parseFloat(taskForm.estimatedHours), dueDate: taskForm.dueDate || null, projectId: id }) }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group">
                <label className="input-label">Task Title *</label>
                <input className="input" placeholder="Implement API integration" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Priority</label>
                  <select className="input" value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Complexity</label>
                  <select className="input" value={taskForm.complexity} onChange={e => setTaskForm({...taskForm, complexity: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Est. Hours</label>
                  <input className="input" type="number" min="0.5" step="0.5" value={taskForm.estimatedHours} onChange={e => setTaskForm({...taskForm, estimatedHours: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Due Date</label>
                  <input className="input" type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTask(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createTask.isPending}>{createTask.isPending ? 'Creating...' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
