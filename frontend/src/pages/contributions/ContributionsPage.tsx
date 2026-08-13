import { useQuery } from '@tanstack/react-query'
import { Trophy, Star, TrendingUp, Target } from 'lucide-react'
import api from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

export default function ContributionsPage() {
  const { employee } = useAuth()
  const { data: all = [] } = useQuery({ queryKey: ['contributions'], queryFn: () => api.get('/contributions').then(r => r.data) })
  const { data: mine } = useQuery({ queryKey: ['my-contrib', employee?.id], queryFn: () => api.get(`/contributions/employee/${employee?.id}`).then(r => r.data), enabled: !!employee?.id })
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: () => api.get('/contributions/rewards').then(r => r.data) })

  const nextReward = rewards.find((r: any) => r.points_required > (mine?.total_points || 0))
  const progressPct = nextReward ? Math.round(((mine?.total_points || 0) / nextReward.points_required) * 100) : 100

  const chartData = all.slice(0, 8).map((c: any) => ({
    name: `${c.employees?.first_name || ''} ${c.employees?.last_name?.[0] || ''}.`,
    points: c.total_points
  }))

  const BADGE_RULES = [
    { name: 'Deadline Hero', icon: '⚡', desc: 'Complete 5+ tasks before deadline', threshold: 300 },
    { name: 'Problem Solver', icon: '🔧', desc: 'Resolve critical tasks', threshold: 500 },
    { name: 'Consistency', icon: '🎯', desc: 'Active for 30+ days', threshold: 800 },
    { name: 'Team Player', icon: '🤝', desc: 'Contribute to 3+ projects', threshold: 400 },
  ]

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Contribution Engine</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>AI-computed points based on impact, complexity, and delivery — not just task count</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: '20px', alignItems: 'start' }}>
        {/* My Points Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.1))', border: '1px solid var(--color-border-accent)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>My Contribution</div>
          <div style={{ fontSize: '48px', fontWeight: 800, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1, marginBottom: '4px' }}>
            {mine?.total_points || 0}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Total Points</div>

          {nextReward ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Next: <strong style={{ color: 'var(--color-text-primary)' }}>{nextReward.title}</strong></span>
                <span style={{ color: 'var(--color-warning)' }}>{nextReward.points_required - (mine?.total_points || 0)} pts left</span>
              </div>
              <div className="progress-bar" style={{ height: '8px' }}>
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--color-success)' }}>🎉 All rewards unlocked!</div>
          )}

          {/* Recent events */}
          {mine?.contribution_events?.length > 0 && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Recent Events</div>
              {mine.contribution_events.slice(0, 5).map((e: any) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{e.description?.slice(0, 50)}...</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600, whiteSpace: 'nowrap' }}>+{e.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Trophy size={15} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#f59e0b' }} />Leaderboard</span>
          </div>
          {all.slice(0, 8).map((c: any, i: number) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < all.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <span style={{ width: '20px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--color-text-muted)' }}>#{i+1}</span>
              <div className="avatar avatar-sm">{c.employees?.first_name?.[0]}{c.employees?.last_name?.[0]}</div>
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{c.employees?.first_name} {c.employees?.last_name}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: i === 0 ? '#f59e0b' : 'var(--color-text-primary)' }}>{c.total_points}</span>
            </div>
          ))}
          {all.length === 0 && <div className="empty-state" style={{ padding: '30px' }}><Trophy size={32} /><p>No contributions yet</p></div>}
        </div>

        {/* Rewards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card">
            <div className="card-header"><span className="card-title"><Target size={15} style={{ marginRight: '6px', verticalAlign: 'middle', color: 'var(--color-primary)' }} />Rewards</span></div>
            {rewards.map((r: any) => {
              const unlocked = (mine?.total_points || 0) >= r.points_required
              return (
                <div key={r.id} style={{ padding: '10px', background: unlocked ? 'var(--color-success-bg)' : 'var(--color-bg-elevated)', borderRadius: '8px', marginBottom: '8px', border: unlocked ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{r.title}</span>
                    {unlocked && <span style={{ fontSize: '11px', color: 'var(--color-success)' }}>✓ Unlocked</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>{r.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: unlocked ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>{r.points_required} pts</span>
                    {!unlocked && (
                      <div style={{ width: '80px' }}>
                        <div className="progress-bar" style={{ height: '4px' }}>
                          <div className="progress-fill" style={{ width: `${Math.min(100, Math.round(((mine?.total_points || 0) / r.points_required) * 100))}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {rewards.length === 0 && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>No rewards configured. Ask admin to add rewards.</p>}
          </div>

          {/* Badges */}
          <div className="card">
            <div className="card-header"><span className="card-title"><Star size={15} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#f59e0b' }} />Badges</span></div>
            {BADGE_RULES.map((b, i) => {
              const earned = (mine?.total_points || 0) >= b.threshold
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', opacity: earned ? 1 : 0.5 }}>
                  <span style={{ fontSize: '20px' }}>{b.icon}</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{b.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{b.desc}</div>
                  </div>
                  {earned && <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '10px' }}>Earned</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
