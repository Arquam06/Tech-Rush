import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { Zap } from 'lucide-react'

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: 'var(--color-bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(99,102,241,0.3)',
        }}>
          <Zap size={22} color="white" />
        </div>
        <div className="animate-spin" style={{
          width: '24px', height: '24px',
          border: '2px solid var(--color-border)',
          borderTop: '2px solid var(--color-primary)',
          borderRadius: '50%',
        }} />
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
          Loading session...
        </span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--color-bg-base)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
