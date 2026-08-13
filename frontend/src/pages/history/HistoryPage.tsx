import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, User, GitBranch, CheckSquare, MessageSquare, Trophy, Bot, FolderKanban } from 'lucide-react'
import api from '../../lib/api'
import { format } from 'date-fns'

const ACTION_ICONS: Record<string, React.ReactNode> = {
  task_completed: <CheckSquare size={14} color="#10b981" />,
  task_created: <CheckSquare size={14} color="#6366f1" />,
  task_assigned: <User size={14} color="#06b6d4" />,
  task_reassigned: <GitBranch size={14} color="#f59e0b" />,
  project_created: <FolderKanban size={14} color="#6366f1" />,
  points_awarded: <Trophy size={14} color="#f59e0b" />,
  meeting_completed: <MessageSquare size={14} color="#06b6d4" />,
  ai_action: <Bot size={14} color="#818cf8" />,
  employee_created: <User size={14} color="#10b981" />,
}

function getIcon(action: string) {
  return ACTION_ICONS[action] || <Clock size={14} color="var(--color-text-muted)" />
}

function getActionLabel(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function HistoryPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['history', page, filter],
    queryFn: () => api.get(`/history?page=${page}&limit=20${filter ? `&entityType=${filter}` : ''}`).then(r => r.data),
  })

  const logs = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Work History</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Complete organizational timeline — {total} events recorded</p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['', 'task', 'project', 'employee', 'meeting', 'contribution'].map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`badge ${filter === f ? 'badge-primary' : 'badge-muted'}`}
            style={{ cursor: 'pointer', fontSize: '12px', padding: '5px 12px' }}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: '70px' }} />)}
        </div>
      ) : (
        <div className="card" style={{ padding: '8px 20px' }}>
          {logs.map((log: any, i: number) => (
            <div key={log.id} className="timeline-item">
              <div className="timeline-dot">
                {getIcon(log.action)}
              </div>
              <div style={{ flex: 1, paddingTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{log.description || getActionLabel(log.action)}</div>
                    {log.why && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Why: {log.why}</div>}
                    {log.actor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                        <div className="avatar avatar-sm" style={{ width: '18px', height: '18px', fontSize: '9px' }}>{log.actor?.first_name?.[0]}</div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{log.actor?.first_name} {log.actor?.last_name}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{format(new Date(log.created_at), 'MMM d')}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{format(new Date(log.created_at), 'h:mm a')}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="empty-state">
              <Clock size={36} />
              <p>No history yet. Actions will appear here as your team works.</p>
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ padding: '5px 12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
