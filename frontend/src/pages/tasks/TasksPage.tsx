import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Clock, User } from 'lucide-react'
import api from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'

const STATUS_OPTIONS = ['todo', 'in_progress', 'blocked', 'in_review', 'done']
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low']

export default function TasksPage() {
  const { employee } = useAuth()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editTask, setEditTask] = useState<any>(null)
  const [form, setForm] = useState({ title: '', priority: 'medium', complexity: 'medium', estimatedHours: '4', dueDate: '', assigneeId: '' })

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', statusFilter, myTasksOnly],
    queryFn: () => api.get(`/tasks${statusFilter ? `?status=${statusFilter}` : ''}${myTasksOnly ? `${statusFilter ? '&' : '?'}assigneeId=${employee?.id}` : ''}`).then(r => r.data)
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then(r => r.data)
  })

  const createTask = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowCreate(false); toast.success('Task created!') }
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
  })

  const assignTask = useMutation({
    mutationFn: ({ id, assigneeId }: any) => api.patch(`/tasks/${id}`, { assignee_id: assigneeId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setEditTask(null); toast.success('Task assigned!') }
  })

  const grouped = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = tasks.filter((t: any) => t.status === status)
    return acc
  }, {} as Record<string, any[]>)

  const statusColor: Record<string, string> = {
    todo: 'var(--color-text-muted)',
    in_progress: 'var(--color-primary)',
    blocked: 'var(--color-danger)',
    in_review: 'var(--color-warning)',
    done: 'var(--color-success)',
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Tasks</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{tasks.length} tasks{myTasksOnly ? ' (mine)' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn btn-sm ${myTasksOnly ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMyTasksOnly(!myTasksOnly)}>
            <User size={13} /> My Tasks
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Task</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className={`badge ${!statusFilter ? 'badge-primary' : 'badge-muted'}`} style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '12px' }} onClick={() => setStatusFilter('')}>All</button>
        {STATUS_OPTIONS.map(s => (
          <button key={s} className={`badge ${statusFilter === s ? 'badge-primary' : 'badge-muted'}`} style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '12px' }} onClick={() => setStatusFilter(s)}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {!statusFilter ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {STATUS_OPTIONS.filter(s => s !== 'done' || grouped['done']?.length > 0).map(status => (
            <div key={status}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', padding: '0 4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor[status] }} />
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>{status.replace('_', ' ')}</span>
                <span className="badge badge-muted" style={{ marginLeft: 'auto', fontSize: '10px' }}>{grouped[status]?.length || 0}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(grouped[status] || []).map((t: any) => (
                  <div key={t.id} className="card" style={{ padding: '12px', cursor: 'pointer' }} onClick={() => setEditTask(t)}>
                    <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', lineHeight: 1.4 }}>{t.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge badge-${t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : t.priority === 'medium' ? 'primary' : 'muted'}`} style={{ fontSize: '10px' }}>{t.priority}</span>
                      {t.employees && (
                        <div className="avatar avatar-sm" title={`${t.employees.first_name} ${t.employees.last_name}`}>{t.employees.first_name?.[0]}{t.employees.last_name?.[0]}</div>
                      )}
                    </div>
                    {t.due_date && (
                      <div style={{ fontSize: '11px', color: new Date(t.due_date) < new Date() ? 'var(--color-danger)' : 'var(--color-text-muted)', marginTop: '6px' }}>
                        <Clock size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />{format(new Date(t.due_date), 'MMM d')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none', borderRadius: '12px' }}>
            <table>
              <thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due Date</th><th>Est. Hours</th></tr></thead>
              <tbody>
                {tasks.map((t: any) => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setEditTask(t)}>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    <td>{t.employees ? `${t.employees.first_name} ${t.employees.last_name}` : <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>}</td>
                    <td><span className={`badge badge-${t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : 'primary'}`}>{t.priority}</span></td>
                    <td><span className={`badge badge-${t.status === 'done' ? 'success' : t.status === 'in_progress' ? 'info' : t.status === 'blocked' ? 'danger' : 'muted'}`}>{t.status}</span></td>
                    <td style={{ fontSize: '12px' }}>{t.due_date ? format(new Date(t.due_date), 'MMM d, yyyy') : '—'}</td>
                    <td style={{ fontSize: '12px' }}>{t.estimated_hours}h</td>
                  </tr>
                ))}
                {tasks.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>No tasks found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Task">
        <form onSubmit={e => { e.preventDefault(); createTask.mutate({ title: form.title, priority: form.priority, complexity: form.complexity, estimatedHours: parseFloat(form.estimatedHours), dueDate: form.dueDate || null, assigneeId: form.assigneeId || null }) }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="input-group"><label className="input-label">Title *</label><input className="input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Task description" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group"><label className="input-label">Priority</label><select className="input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>{PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div className="input-group"><label className="input-label">Complexity</label><select className="input" value={form.complexity} onChange={e => setForm({...form, complexity: e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group"><label className="input-label">Est. Hours</label><input className="input" type="number" min="0.5" step="0.5" value={form.estimatedHours} onChange={e => setForm({...form, estimatedHours: e.target.value})} /></div>
            <div className="input-group"><label className="input-label">Due Date</label><input className="input" type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} /></div>
          </div>
          <div className="input-group"><label className="input-label">Assignee</label><select className="input" value={form.assigneeId} onChange={e => setForm({...form, assigneeId: e.target.value})}><option value="">Unassigned</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}</select></div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}><button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={createTask.isPending}>{createTask.isPending ? 'Creating...' : 'Create Task'}</button></div>
        </form>
      </Modal>

      {/* Edit/View Task Modal */}
      <Modal isOpen={!!editTask} onClose={() => setEditTask(null)} title={editTask?.title || 'Edit Task'} maxWidth="480px">
        {editTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`badge badge-${editTask.priority === 'critical' ? 'danger' : editTask.priority === 'high' ? 'warning' : 'primary'}`}>{editTask.priority}</span>
              <span className="badge badge-muted">{editTask.complexity} complexity</span>
              <span className="badge badge-muted">{editTask.estimated_hours}h estimated</span>
            </div>
            <div className="input-group">
              <label className="input-label">Update Status</label>
              <select className="input" defaultValue={editTask.status} onChange={e => { updateStatus.mutate({ id: editTask.id, status: e.target.value }); setEditTask({ ...editTask, status: e.target.value }) }}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Reassign To</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="input" defaultValue={editTask.assignee_id || ''} id="reassign-select">
                  <option value="">Unassigned</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => { const sel = (document.getElementById('reassign-select') as HTMLSelectElement)?.value; assignTask.mutate({ id: editTask.id, assigneeId: sel }) }}>Assign</button>
              </div>
            </div>
            {editTask.projects && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Project: {editTask.projects.title}</div>}
            {editTask.due_date && <div style={{ fontSize: '12px', color: new Date(editTask.due_date) < new Date() ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>Due: {format(new Date(editTask.due_date), 'MMM d, yyyy')}</div>}
          </div>
        )}
      </Modal>
    </div>
  )
}
