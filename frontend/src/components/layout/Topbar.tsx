import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, LogOut, Menu, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { getInitials } from '../../utils/initials'

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { employee, logout } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30000,
  })

  const unreadCount = notifications.filter((n: any) => !n.is_read).length
  const initials = getInitials(employee?.first_name, employee?.last_name, employee?.email)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  return (
    <header className="topbar">
      <button onClick={onMenuClick} className="btn btn-ghost btn-icon" style={{ marginRight: '4px' }}>
        <Menu size={18} />
      </button>

      {/* Search */}
      <div style={{
        flex: 1,
        maxWidth: '360px',
        position: 'relative',
      }}>
        <Search size={14} style={{
          position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--color-text-muted)',
        }} />
        <input
          className="input"
          placeholder="Search projects, tasks, people…"
          style={{ paddingLeft: '32px', height: '34px' }}
          onFocus={() => navigate('/ai-agent')}
          readOnly
      /></div>

      <div style={{ flex: 1 }} />

      {/* Company badge */}
      {employee?.companies?.name && (
        <div className="badge badge-primary">
          {employee.companies.name}
        </div>
      )}

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button className="btn btn-ghost btn-icon">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="notification-dot" />
          )}
        </button>
      </div>

      {/* User menu */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost"
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{ gap: '8px', padding: '6px 10px' }}
        >
          <div className="avatar avatar-sm">
            {initials}
          </div>
          {!showUserMenu && (
            <span style={{ fontSize: '13px' }}>{employee?.first_name}</span>
          )}
          <ChevronDown size={14} />
        </button>
        {showUserMenu && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: '10px', padding: '8px', minWidth: '180px',
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            <div style={{ padding: '8px 12px', marginBottom: '4px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{employee?.first_name} {employee?.last_name}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{employee?.role}</div>
            </div>
            <button
              className="nav-item"
              onClick={handleLogout}
              style={{ width: '100%', color: 'var(--color-danger)' }}
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
