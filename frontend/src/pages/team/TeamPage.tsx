import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'

export default function TeamPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then(r => r.data)
  })

  const create = useMutation({
    mutationFn: (d: any) => api.post('/teams', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      setShowCreate(false)
      setForm({ name: '', description: '' })
      toast.success('Team created!')
    }
  })

  const healthColor = (score: number) => score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'
  const healthLabel = (score: number) => score >= 80 ? 'Healthy' : score >= 60 ? 'Moderate' : 'At Risk'

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Teams</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{teams.length} teams — AI-computed team health</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Team</button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {teams.map((team: any) => {
            const health = team.health || {}
            const score = health.score || 0
            const dims = health.dimensions || {}
            return (
              <div key={team.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{team.name}</div>
                    {team.description && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{team.description}</div>}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: healthColor(score), lineHeight: 1 }}>{score}</div>
                    <div style={{ fontSize: '10px', color: healthColor(score), textTransform: 'uppercase', fontWeight: 600 }}>{healthLabel(score)}</div>
                  </div>
                </div>

                {Object.keys(dims).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                    {Object.entries(dims).map(([key, val]: any) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{key}</span>
                          <span style={{ fontSize: '11px', color: healthColor(val) }}>{val}</span>
                        </div>
                        <div className="workload-bar">
                          <div className="workload-fill" style={{ width: `${val}%`, background: healthColor(val) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(team.team_members || []).slice(0, 6).map((m: any, i: number) => (
                    <div key={i} className="avatar avatar-sm" title={`${m.employees?.first_name} ${m.employees?.last_name}`}>
                      {m.employees?.first_name?.[0]}{m.employees?.last_name?.[0]}
                    </div>
                  ))}
                  {team.team_members?.length > 6 && <div className="badge badge-muted">+{team.team_members.length - 6}</div>}
                </div>
              </div>
            )
          })}
          {teams.length === 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state">
                <Users size={48} />
                <p>No teams yet. Create your first team.</p>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Team</button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Team">
        <form onSubmit={e => { e.preventDefault(); create.mutate(form) }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="input-group">
            <label className="input-label">Team Name *</label>
            <input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Engineering" />
          </div>
          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create Team'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
