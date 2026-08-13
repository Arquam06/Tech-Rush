import { useQuery } from '@tanstack/react-query'
import { Brain, TrendingUp } from 'lucide-react'
import api from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

export default function SkillsPage() {
  const { employee } = useAuth()
  const { data: skills = [] } = useQuery({
    queryKey: ['skills', employee?.id],
    queryFn: () => api.get(`/skills/employee/${employee?.id}`).then(r => r.data),
    enabled: !!employee?.id
  })

  const radarData = skills.slice(0, 8).map((s: any) => ({ subject: s.skill_name, value: s.proficiency }))

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Skill Graph</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Dynamic skill profile built from completed work, projects, and manager input</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        <div className="card">
          <div className="card-header"><span className="card-title"><Brain size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Skill Radar</span></div>
          {skills.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Brain size={36} />
              <p>No skills recorded yet. Complete tasks to build your profile.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title"><TrendingUp size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Skills</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {skills.map((s: any) => (
              <div key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{s.skill_name}</span>
                  <span style={{ fontSize: '12px', color: s.proficiency >= 80 ? 'var(--color-success)' : s.proficiency >= 60 ? 'var(--color-primary)' : 'var(--color-warning)', fontWeight: 600 }}>{s.proficiency}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${s.proficiency}%`, background: s.proficiency >= 80 ? 'var(--color-success)' : s.proficiency >= 60 ? 'var(--color-primary)' : 'var(--color-warning)' }} />
                </div>
              </div>
            ))}
            {skills.length === 0 && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>Skills will appear as you complete tasks and projects</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
