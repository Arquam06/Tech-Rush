import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProjectsPage from './pages/projects/ProjectsPage'
import ProjectDetailPage from './pages/projects/ProjectDetailPage'
import TasksPage from './pages/tasks/TasksPage'
import TeamPage from './pages/team/TeamPage'
import EmployeePage from './pages/employees/EmployeePage'
import AIAgentPage from './pages/ai/AIAgentPage'
import MeetingsPage from './pages/meetings/MeetingsPage'
import MeetingRoomPage from './pages/meetings/MeetingRoomPage'
import ContributionsPage from './pages/contributions/ContributionsPage'
import HistoryPage from './pages/history/HistoryPage'
import SkillsPage from './pages/skills/SkillsPage'
import AdminPage from './pages/admin/AdminPage'
import NotFoundPage from './pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function FullPageSpinner() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg-base)',
      flexDirection: 'column', gap: '16px'
    }}>
      <div style={{
        width: '40px', height: '40px',
        border: '3px solid var(--color-border)',
        borderTop: '3px solid var(--color-primary)',
        borderRadius: '50%'
      }} className="animate-spin" />
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading AI Workplace OS…</p>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-strong)',
                fontSize: '13px',
                borderRadius: '10px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="employees" element={<EmployeePage />} />
              <Route path="ai-agent" element={<AIAgentPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="meetings/:id" element={<MeetingRoomPage />} />
              <Route path="contributions" element={<ContributionsPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
