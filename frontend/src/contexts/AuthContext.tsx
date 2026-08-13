import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import api from '../lib/api'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('your-project') && !supabaseUrl.includes('placeholder')

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
  }
})

interface Employee {
  id: string
  company_id: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'hr' | 'manager' | 'employee'
  title?: string
  avatar_url?: string
  companies?: { name: string; id: string }
  departments?: { name: string }
}

interface AuthContextValue {
  user: any
  employee: Employee | null
  loading: boolean
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshEmployee: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('ai_workplace_user')
    return saved ? JSON.parse(saved) : null
  })
  const [employee, setEmployee] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('ai_workplace_employee')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('ai_workplace_token') || null
  })
  const [loading, setLoading] = useState(true)

  const fetchEmployee = useCallback(async (accessToken: string) => {
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      const res = await api.get('/auth/me')
      if (res.data.employee) {
        setEmployee(res.data.employee)
        localStorage.setItem('ai_workplace_employee', JSON.stringify(res.data.employee))
      }
    } catch (err) {
      console.warn('Employee profile fetch notice:', err)
    }
  }, [])

  useEffect(() => {
    // Set token header if exists
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }

    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setUser(session.user)
          setToken(session.access_token)
          localStorage.setItem('ai_workplace_user', JSON.stringify(session.user))
          localStorage.setItem('ai_workplace_token', session.access_token)
          fetchEmployee(session.access_token).finally(() => setLoading(false))
        } else {
          setLoading(false)
        }
      }).catch(() => setLoading(false))

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setUser(session.user)
          setToken(session.access_token)
          localStorage.setItem('ai_workplace_user', JSON.stringify(session.user))
          localStorage.setItem('ai_workplace_token', session.access_token)
          api.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`
          fetchEmployee(session.access_token)
        } else {
          setUser(null)
          setEmployee(null)
          setToken(null)
          localStorage.removeItem('ai_workplace_user')
          localStorage.removeItem('ai_workplace_employee')
          localStorage.removeItem('ai_workplace_token')
          delete api.defaults.headers.common['Authorization']
        }
      })

      return () => subscription.unsubscribe()
    } else {
      // Local demo mode using backend JWT/session
      if (token) {
        fetchEmployee(token).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }
  }, [fetchEmployee, token])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { session, user: authUser, employee: emp } = res.data
    const accessToken = session?.access_token || res.data.token || 'demo-jwt-token'
    const currentUser = authUser || { id: emp?.user_id || emp?.id, email }

    if (isSupabaseConfigured && session) {
      try { await supabase.auth.setSession(session) } catch {}
    }

    setUser(currentUser)
    setToken(accessToken)
    setEmployee(emp)
    localStorage.setItem('ai_workplace_user', JSON.stringify(currentUser))
    localStorage.setItem('ai_workplace_employee', JSON.stringify(emp))
    localStorage.setItem('ai_workplace_token', accessToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    if (isSupabaseConfigured) {
      try { await supabase.auth.signOut() } catch {}
    }
    setUser(null)
    setEmployee(null)
    setToken(null)
    localStorage.removeItem('ai_workplace_user')
    localStorage.removeItem('ai_workplace_employee')
    localStorage.removeItem('ai_workplace_token')
    delete api.defaults.headers.common['Authorization']
  }

  const refreshEmployee = async () => {
    if (token) await fetchEmployee(token)
  }

  return (
    <AuthContext.Provider value={{ user, employee, loading, token, login, logout, refreshEmployee }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { supabase }
