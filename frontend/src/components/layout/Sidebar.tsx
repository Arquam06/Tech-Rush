import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, UserCog,
  Bot, Video, Trophy, Clock, Zap, Settings, ChevronLeft, ChevronRight,
  Brain
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getInitials } from '../../utils/initials'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'Projects', path: '/projects', icon: <FolderKanban size={18} /> },
  { label: 'Tasks', path: '/tasks', icon: <CheckSquare size={18} /> },
  { label: 'Teams', path: '/team', icon: <Users size={18} /> },
  { label: 'Employees', path: '/employees', icon: <UserCog size={18} />, roles: ['admin', 'hr', 'manager'] },
  { label: 'Meetings', path: '/meetings', icon: <Video size={18} /> },
  { label: 'AI Agent', path: '/ai-agent', icon: <Bot size={18} /> },
  { label: 'Contributions', path: '/contributions', icon: <Trophy size={18} /> },
  { label: 'Skills', path: '/skills', icon: <Brain size={18} /> },
  { label: 'History', path: '/history', icon: <Clock size={18} /> },
  { label: 'Admin', path: '/admin', icon: <Settings size={18} />, roles: ['admin', 'hr'] },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { employee } = useAuth()
  const location = useLocation()

  const visibleItems = navItems.filter(item =>
    !item.roles || item.roles.includes(employee?.role || 'employee')
  )

  const initials = getInitials(employee?.first_name, employee?.last_name, employee?.email)

  return (
    <aside style={{
      width: collapsed ? '60px' : '240px',
      minWidth: collapsed ? '60px' : '240px',
      height: '100vh',
      background: 'var(--color-bg-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: '10px',
        height: '56px',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Zap size={14} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>
              AI Workplace OS
            </span>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color="white" />
          </div>
        )}
        {!collapsed && (
          <button onClick={onToggle} className="btn btn-ghost btn-icon" style={{ padding: '4px' }}>
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {!collapsed && (
          <div className="nav-section-title">Navigation</div>
        )}
        {visibleItems.map(item => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
              style={{ justifyContent: collapsed ? 'center' : undefined }}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* User info */}
      {!collapsed && employee && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div className="avatar avatar-sm">
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {employee.first_name} {employee.last_name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
              {employee.role}
            </div>
          </div>
        </div>
      )}

      {collapsed && (
        <div style={{ padding: '8px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}>
          <button onClick={onToggle} className="btn btn-ghost btn-icon">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </aside>
  )
}
