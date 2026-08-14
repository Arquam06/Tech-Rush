import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, FolderKanban, CheckSquare, Users, Zap, ArrowRight, Clock, Target, Brain } from 'lucide-react'
import api from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

function StatCard({ label, value, icon, color, subtitle }: any) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {subtitle && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  )
}

function RiskBadge({ score }: { score: number }) {
  const level = score >= 70 ? 'danger' : score >= 45 ? 'warning' : score >= 25 ? 'info' : 'success'
  const label = score >= 70 ? 'Critical' : score >= 45 ? 'High' : score >= 25 ? 'Medium' : 'Low'
  return <span className={`badge badge-${level}`}>{label} {score}%</span>
}

export default function DashboardPage() {
  const { employee } = useAuth()
  const navigate = useNavigate()
  const isManager = ['admin', 'manager', 'hr'].includes(employee?.role || '')

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data).catch(() => ({}))
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => Array.isArray(r.data) ? r.data : []).catch(() => [])
  })

  const { data: myTasks = [] } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => api.get(`/tasks?assigneeId=${employee?.id}`).then(r => Array.isArray(r.data) ? r.data : []).catch(() => []),
    enabled: !!employee?.id
  })

  const { data: historyData = [] } = useQuery({
    queryKey: ['history-recent'],
    queryFn: () => api.get('/history?limit=8').then(r => Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : [])).catch(() => [])
  })

  const { data: myContrib } = useQuery({
    queryKey: ['my-contrib', employee?.id],
    queryFn: () => api.get(`/contributions/employee/${employee?.id}`).then(r => r.data).catch(() => null),
    enabled: !!employee?.id
  })

  const { data: rewards = [] } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => api.get('/contributions/rewards').then(r => Array.isArray(r.data) ? r.data : []).catch(() => [])
  })

  const safeProjects = Array.isArray(projects) ? projects : []
  const safeTasks = Array.isArray(myTasks) ? myTasks : []
  const safeRewards = Array.isArray(rewards) ? rewards : []
  const safeHistory = Array.isArray(historyData) ? historyData : []

  const atRiskProjects = safeProjects.filter((p: any) => p.risk?.score >= 45)
  const myPendingTasks = safeTasks.filter((t: any) => t.status !== 'done')
  const nextReward = safeRewards.find((r: any) => r.points_required > (myContrib?.total_points || 0))
  const progressToNext = nextReward ? Math.round(((myContrib?.total_points || 0) / nextReward.points_required) * 100) : 100

  // Team health radar data
  const radarData = [
    { subject: 'Workload', value: 72 },
    { subject: 'Deadlines', value: 81 },
    { subject: 'Blockers', value: 64 },
    { subject: 'Progress', value: 79 },
    { subject: 'Collab', value: 85 },
  ]

  const actionHistory = safeHistory.slice(0, 6)

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {employee?.first_name || 'Team Member'} 👋
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/ai-agent')}>
          <Zap size={15} /> AI Agent
        </button>
      </div>

      {/* AT RISK ALERT */}
      {atRiskProjects.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '12px', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <AlertTriangle size={20} color="var(--color-danger)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-danger)', marginBottom: '2px' }}>
              {atRiskProjects.length} Project{atRiskProjects.length > 1 ? 's' : ''} At Risk
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {atRiskProjects.map((p: any) => p.title).join(', ')} — requires attention
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => navigate('/projects')}>
            View <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Stats Row */}
      {isManager && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <StatCard label="Total Employees" value={stats.totalEmployees || 1} icon={<Users size={18} />} color="#6366f1" />
          <StatCard label="Active Projects" value={stats.activeProjects || 0} icon={<FolderKanban size={18} />} color="#06b6d4" />
          <StatCard label="Total Tasks" value={stats.totalTasks || 0} icon={<CheckSquare size={18} />} color="#10b981" subtitle={`${stats.completedTasks || 0} completed`} />
          <StatCard label="At Risk" value={atRiskProjects.length} icon={<AlertTriangle size={18} />} color="#ef4444" />
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isManager ? '1fr 1fr 320px' : '1fr 320px', gap: '20px', alignItems: 'start' }}>
        {/* Projects at risk */}
        {isManager && (
          <div className="card">
            <div className="card-header">
              <span className="card-title"><FolderKanban size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--color-primary)' }} />Projects</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>View all</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {safeProjects.slice(0, 5).map((p: any) => (
                <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} style={{
                  padding: '12px', background: 'var(--color-bg-elevated)', borderRadius: '8px',
                  cursor: 'pointer', transition: 'all 0.15s', border: '1px solid var(--color-border)',
                }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{p.title}</span>
                    <RiskBadge score={p.risk?.score || 0} />
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${p.risk?.score || 0}%`, background: p.risk?.score >= 70 ? 'var(--color-danger)' : p.risk?.score >= 45 ? 'var(--color-warning)' : 'var(--color-success)' }} />
                  </div>
                </div>
              ))}
              {safeProjects.length === 0 && (
                <div className="empty-state" style={{ padding: '30px' }}>
                  <FolderKanban size={32} color="var(--color-text-muted)" />
                  <p>No projects yet</p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects')}>Create Project</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Tasks */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><CheckSquare size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--color-secondary)' }} />My Tasks</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {myPendingTasks.slice(0, 6).map((t: any) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', background: 'var(--color-bg-elevated)',
                borderRadius: '8px', border: '1px solid var(--color-border)',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: t.priority === 'critical' ? 'var(--color-danger)' : t.priority === 'high' ? 'var(--color-warning)' : t.priority === 'medium' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }} />
                <span style={{ fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                {t.due_date && (
                  <span style={{ fontSize: '11px', color: new Date(t.due_date) < new Date() ? 'var(--color-danger)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {format(new Date(t.due_date), 'MMM d')}
                  </span>
                )}
              </div>
            ))}
            {myPendingTasks.length === 0 && (
              <div className="empty-state" style={{ padding: '30px' }}>
                <CheckSquare size={32} color="var(--color-success)" />
                <p style={{ color: 'var(--color-success)' }}>All caught up! 🎉</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Contribution Points */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><Target size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#f59e0b' }} />Points</span>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
              <div style={{ fontSize: '36px', fontWeight: 800, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                {myContrib?.total_points || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Contribution Points</div>
            </div>
            {nextReward && (
              <>
                <div className="progress-bar" style={{ marginBottom: '6px' }}>
                  <div className="progress-fill" style={{ width: `${progressToNext}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  <span>Next: {nextReward.title}</span>
                  <span>{nextReward.points_required - (myContrib?.total_points || 0)} pts left</span>
                </div>
              </>
            )}
          </div>

          {/* Team Health Radar */}
          {isManager && (
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Brain size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--color-primary)' }} />Team Health</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent History */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><Clock size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--color-secondary)' }} />Recent Activity</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>All</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {actionHistory.map((log: any, i: number) => (
                <div key={log.id || i} className="timeline-item" style={{ paddingLeft: '4px' }}>
                  <div className="timeline-dot" style={{ width: '24px', height: '24px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                  </div>
                  <div style={{ flex: 1, paddingTop: '4px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{log.description}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {log.created_at ? format(new Date(log.created_at), 'MMM d, h:mm a') : 'Recently'}
                    </div>
                  </div>
                </div>
              ))}
              {actionHistory.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
