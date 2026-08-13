import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderKanban, Plus, Clock } from 'lucide-react'
import api from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981', planning: '#6366f1', on_hold: '#f59e0b', completed: '#06b6d4', cancelled: '#ef4444'
}

export default function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', endDate: '' })
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data)
  })

  const create = useMutation({
    mutationFn: (data: any) => api.post('/projects', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setShowCreate(false)
      setForm({ title: '', description: '', priority: 'medium', endDate: '' })
      toast.success('Project created!')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create project')
  })

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Projects</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{projects.length} total projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> New Project
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '160px', borderRadius: '12px' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {projects.map((p: any) => (
            <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{p.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{p.description?.slice(0, 60)}{p.description?.length > 60 ? '…' : ''}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span className="badge" style={{ background: `${STATUS_COLORS[p.status] || '#6366f1'}20`, color: STATUS_COLORS[p.status] || '#6366f1', border: `1px solid ${STATUS_COLORS[p.status] || '#6366f1'}40` }}>
                    {p.status}
                  </span>
                  {p.risk?.score > 0 && (
                    <span className={`badge badge-${p.risk?.level === 'critical' ? 'danger' : p.risk?.level === 'high' ? 'warning' : p.risk?.level === 'medium' ? 'info' : 'success'}`}>
                      {p.risk?.score}% risk
                    </span>
                  )}
                </div>
              </div>
              {p.risk?.score > 0 && (
                <div className="progress-bar" style={{ marginBottom: '10px' }}>
                  <div className="progress-fill" style={{ width: `${p.risk?.score}%`, background: p.risk?.score >= 70 ? 'var(--color-danger)' : p.risk?.score >= 45 ? 'var(--color-warning)' : 'var(--color-success)' }} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {p.project_members?.slice(0, 4).map((m: any, i: number) => (
                    <div key={i} className="avatar avatar-sm" title={`${m.employees?.first_name} ${m.employees?.last_name}`}>
                      {m.employees?.first_name?.[0]}{m.employees?.last_name?.[0]}
                    </div>
                  ))}
                </div>
                {p.end_date && (
                  <span style={{ fontSize: '11px', color: new Date(p.end_date) < new Date() ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                    <Clock size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                    {format(new Date(p.end_date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state">
                <FolderKanban size={48} />
                <p>No projects yet. Create your first project to get started.</p>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Project</button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Project">
        <form onSubmit={e => { e.preventDefault(); create.mutate({ title: form.title, description: form.description, priority: form.priority, endDate: form.endDate || null }) }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label">Project Title *</label>
            <input className="input" placeholder="Project Alpha" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea className="input" placeholder="What is this project about?" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">End Date</label>
              <input className="input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
