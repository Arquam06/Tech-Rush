import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, Building2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({
    email: '', password: '',
    firstName: '', lastName: '', companyName: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Signed in successfully!')
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('Account created!')
      // Auto-login after registration
      await login(form.email, form.password)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '-200px', left: '-200px',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-200px', right: '-200px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }} className="animate-fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 30px rgba(99,102,241,0.3)',
          }}>
            <Zap size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>AI Workplace OS</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            The intelligent connected workplace
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', gap: '4px',
            background: 'var(--color-bg-input)', borderRadius: '8px',
            padding: '4px', marginBottom: '28px',
          }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '7px', borderRadius: '6px',
                  border: 'none', cursor: 'pointer',
                  fontWeight: 500, fontSize: '13px', transition: 'all 0.15s',
                  background: mode === m ? 'var(--color-primary)' : 'transparent',
                  color: mode === m ? 'white' : 'var(--color-text-muted)',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'register' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">First Name</label>
                    <input className="input" placeholder="Arquam" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Last Name</label>
                    <input className="input" placeholder="Khan" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Company Name</label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input className="input" style={{ paddingLeft: '32px' }} placeholder="Acme Corp" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} required />
                  </div>
                </div>
              </>
            )}
            <div className="input-group">
              <label className="input-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input className="input" style={{ paddingLeft: '32px' }} type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input className="input" style={{ paddingLeft: '32px', paddingRight: '36px' }} type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: '4px', justifyContent: 'center' }}>
              {loading ? (
                <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%' }} />
              ) : (
                <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-bg-input)', borderRadius: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <strong style={{ color: 'var(--color-text-secondary)' }}>Demo:</strong> Register a new account to create your workspace, or sign in with any email & password.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
