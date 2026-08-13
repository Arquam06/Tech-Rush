import { useNavigate } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)', flexDirection: 'column', gap: '16px' }}>
      <AlertTriangle size={48} color="var(--color-warning)" />
      <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Page Not Found</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>The page you're looking for doesn't exist.</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        <Home size={16} /> Go Home
      </button>
    </div>
  )
}
