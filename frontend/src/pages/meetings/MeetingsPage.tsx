import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Video, Plus, Calendar, ArrowRight } from 'lucide-react'
import api from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'

const STATUS_COLORS: Record<string, string> = { scheduled: '#6366f1', live: '#10b981', completed: '#06b6d4', cancelled: '#ef4444' }

export default function MeetingsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', scheduledAt: '', duration: '60' })

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => api.get('/meetings').then(r => r.data)
  })

  const create = useMutation({
    mutationFn: (d: any) => api.post('/meetings', d),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['meetings'] }); setShowCreate(false); toast.success('Meeting created!'); navigate(`/meetings/${res.data.id}`) }
  })

  const upcoming = meetings.filter((m: any) => m.status === 'scheduled')
  const past = meetings.filter((m: any) => ['completed', 'cancelled'].includes(m.status))

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Meetings</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>AI-powered meeting intelligence — decisions, tasks, risks extracted automatically</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Meeting</button>
      </div>

      {upcoming.length > 0 && (
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Upcoming</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {upcoming.map((m: any) => (
              <div key={m.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/meetings/${m.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{m.title}</div>
                  <span className="badge" style={{ background: `${STATUS_COLORS[m.status]}20`, color: STATUS_COLORS[m.status], border: `1px solid ${STATUS_COLORS[m.status]}40` }}>{m.status}</span>
                </div>
                {m.scheduled_at && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}><Calendar size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{format(new Date(m.scheduled_at), 'MMM d, h:mm a')}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>{(m.meeting_participants || []).slice(0, 4).map((p: any, i: number) => <div key={i} className="avatar avatar-sm">{p.employees?.first_name?.[0]}</div>)}</div>
                  <button className="btn btn-primary btn-sm" onClick={e => {
                    e.stopPropagation();
                    const url = m.meeting_url || m.meetingUrl;
                    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                      window.open(url, '_blank');
                    } else {
                      navigate(`/meetings/${m.id}`);
                    }
                  }}><ArrowRight size={13} /> Join</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Past Meetings</h2>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: 'none', borderRadius: '12px' }}>
              <table>
                <thead><tr><th>Meeting</th><th>Date</th><th>Participants</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {past.map((m: any) => (
                    <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/meetings/${m.id}`)}>
                      <td style={{ fontWeight: 500 }}>{m.title}</td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{m.scheduled_at ? format(new Date(m.scheduled_at), 'MMM d, yyyy') : '—'}</td>
                      <td><div style={{ display: 'flex', gap: '4px' }}>{(m.meeting_participants || []).slice(0, 3).map((p: any, i: number) => <div key={i} className="avatar avatar-sm">{p.employees?.first_name?.[0]}</div>)}</div></td>
                      <td><span className="badge badge-success">Completed</span></td>
                      <td><button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/meetings/${m.id}`) }}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {meetings.length === 0 && !isLoading && (
        <div className="empty-state">
          <Video size={48} />
          <p>No meetings yet. Schedule your first AI-powered meeting.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Meeting</button>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Schedule Meeting">
        <form onSubmit={e => { e.preventDefault(); create.mutate({ title: form.title, description: form.description, scheduledAt: form.scheduledAt || null, duration: parseInt(form.duration) }) }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="input-group">
            <label className="input-label">Title *</label>
            <input className="input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Sprint Planning" />
          </div>
          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Date & Time</label>
              <input className="input" type="datetime-local" value={form.scheduledAt} onChange={e => setForm({...form, scheduledAt: e.target.value})} />
            </div>
            <div className="input-group">
              <label className="input-label">Duration (min)</label>
              <input className="input" type="number" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create Meeting'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
