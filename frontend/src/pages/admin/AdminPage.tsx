import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Users, Trophy, Building2, Plus, BarChart2 } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'departments'>('overview')
  const [rewardForm, setRewardForm] = useState({ title: '', description: '', pointsRequired: '', category: 'recognition' })
  const [deptForm, setDeptForm] = useState({ name: '', description: '' })

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get('/admin/stats').then(r => r.data) })
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) })
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: () => api.get('/contributions/rewards').then(r => r.data) })
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/admin/departments').then(r => r.data) })

  const createReward = useMutation({
    mutationFn: (d: any) => api.post('/admin/rewards', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rewards'] }); setRewardForm({ title: '', description: '', pointsRequired: '', category: 'recognition' }); toast.success('Reward created!') }
  })

  const createDept = useMutation({
    mutationFn: (d: any) => api.post('/admin/departments', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setDeptForm({ name: '', description: '' }); toast.success('Department created!') }
  })

  const tabs = [{ id: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> }, { id: 'rewards', label: 'Rewards', icon: <Trophy size={14} /> }, { id: 'departments', label: 'Departments', icon: <Building2 size={14} /> }]

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Admin Panel</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Company configuration and organizational management</p>
      </div>

      <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-surface)', borderRadius: '10px', padding: '4px', border: '1px solid var(--color-border)', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '13px', transition: 'all 0.15s', background: activeTab === t.id ? 'var(--color-primary)' : 'transparent', color: activeTab === t.id ? 'white' : 'var(--color-text-muted)' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Employees', value: stats.totalEmployees, color: '#6366f1' },
            { label: 'Projects', value: stats.totalProjects, color: '#06b6d4' },
            { label: 'Active Projects', value: stats.activeProjects, color: '#10b981' },
            { label: 'Total Tasks', value: stats.totalTasks, color: '#f59e0b' },
            { label: 'Completed Tasks', value: stats.completedTasks, color: '#10b981' },
            { label: 'Meetings', value: stats.totalMeetings, color: '#818cf8' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Active Rewards</span></div>
            {rewards.map((r: any) => (
              <div key={r.id} style={{ padding: '12px', background: 'var(--color-bg-elevated)', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.description}</div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-warning)', whiteSpace: 'nowrap' }}>{r.points_required} pts</span>
              </div>
            ))}
            {rewards.length === 0 && <div className="empty-state" style={{ padding: '30px' }}><Trophy size={32} /><p>No rewards yet</p></div>}
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Create Reward</span></div>
            <form onSubmit={e => { e.preventDefault(); createReward.mutate({ title: rewardForm.title, description: rewardForm.description, pointsRequired: parseInt(rewardForm.pointsRequired), category: rewardForm.category }) }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="input-group"><label className="input-label">Title *</label><input className="input" required value={rewardForm.title} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} placeholder="Performance Bonus" /></div>
              <div className="input-group"><label className="input-label">Description</label><input className="input" value={rewardForm.description} onChange={e => setRewardForm({...rewardForm, description: e.target.value})} /></div>
              <div className="input-group"><label className="input-label">Points Required *</label><input className="input" type="number" required value={rewardForm.pointsRequired} onChange={e => setRewardForm({...rewardForm, pointsRequired: e.target.value})} placeholder="1000" /></div>
              <div className="input-group"><label className="input-label">Category</label><select className="input" value={rewardForm.category} onChange={e => setRewardForm({...rewardForm, category: e.target.value})}><option value="recognition">Recognition</option><option value="financial">Financial</option><option value="time_off">Time Off</option><option value="learning">Learning</option></select></div>
              <button type="submit" className="btn btn-primary" disabled={createReward.isPending}>{createReward.isPending ? 'Creating...' : 'Create Reward'}</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: 'none', borderRadius: '12px' }}>
              <table><thead><tr><th>Department</th><th>Description</th></tr></thead><tbody>
                {departments.map((d: any) => (<tr key={d.id}><td style={{ fontWeight: 500 }}>{d.name}</td><td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{d.description || '—'}</td></tr>))}
                {departments.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>No departments yet</td></tr>}
              </tbody></table>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Add Department</span></div>
            <form onSubmit={e => { e.preventDefault(); createDept.mutate(deptForm) }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="input-group"><label className="input-label">Name *</label><input className="input" required value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} placeholder="Engineering" /></div>
              <div className="input-group"><label className="input-label">Description</label><textarea className="input" rows={3} value={deptForm.description} onChange={e => setDeptForm({...deptForm, description: e.target.value})} style={{ resize: 'vertical' }} /></div>
              <button type="submit" className="btn btn-primary" disabled={createDept.isPending}>{createDept.isPending ? 'Adding...' : 'Add Department'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
