import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
