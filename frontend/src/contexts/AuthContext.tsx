import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import api from '../lib/api'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseAnonKey.startsWith('eyJ') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseUrl.includes('placeholder')
)

let supabase: any = null
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  } catch (err) {
    console.warn('Supabase client initialization notice:', err)
    supabase = null
  }
}

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
    try {
      const saved = localStorage.getItem('ai_workplace_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const [employee, setEmployee] = useState<Employee | null>(() => {
    try {
      const saved = localStorage.getItem('ai_workplace_employee')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('ai_workplace_token') || null
  })

  const [loading, setLoading] = useState(true)

  const clearAuthData = useCallback(() => {
    setUser(null)
    setEmployee(null)
    setToken(null)
    localStorage.removeItem('ai_workplace_user')
    localStorage.removeItem('ai_workplace_employee')
    localStorage.removeItem('ai_workplace_token')
    delete api.defaults.headers.common['Authorization']
  }, [])

  const fetchEmployee = useCallback(async (accessToken: string) => {
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      const res = await api.get('/auth/me')
      if (res.data.employee) {
        setEmployee(res.data.employee)
        localStorage.setItem('ai_workplace_employee', JSON.stringify(res.data.employee))
      }
      if (res.data.user) {
        setUser(res.data.user)
        localStorage.setItem('ai_workplace_user', JSON.stringify(res.data.user))
      }
    } catch (err: any) {
      console.warn('Employee profile fetch notice:', err)
      if (err.response?.status === 401) {
        clearAuthData()
      }
    }
  }, [clearAuthData])

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }: any) => {
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

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
        if (session) {
          setUser(session.user)
          setToken(session.access_token)
          localStorage.setItem('ai_workplace_user', JSON.stringify(session.user))
          localStorage.setItem('ai_workplace_token', session.access_token)
          api.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`
          fetchEmployee(session.access_token).finally(() => setLoading(false))
        } else {
          clearAuthData()
          setLoading(false)
        }
      })

      return () => subscription.unsubscribe()
    } else {
      if (token) {
        fetchEmployee(token).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }
  }, [fetchEmployee, token, clearAuthData])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { session, user: authUser, employee: emp, token: jwtToken } = res.data
    const accessToken = session?.access_token || jwtToken || 'demo-jwt-token'
    const currentUser = authUser || { id: emp?.user_id || emp?.id, email }

    // Set authorization header immediately
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

    // Synchronously store credentials
    localStorage.setItem('ai_workplace_user', JSON.stringify(currentUser))
    if (emp) localStorage.setItem('ai_workplace_employee', JSON.stringify(emp))
    localStorage.setItem('ai_workplace_token', accessToken)

    if (isSupabaseConfigured && session && supabase) {
      try { await supabase.auth.setSession(session) } catch {}
    }

    // Synchronously update context state
    setUser(currentUser)
    setEmployee(emp || null)
    setToken(accessToken)
    setLoading(false)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    if (isSupabaseConfigured && supabase) {
      try { await supabase.auth.signOut() } catch {}
    }
    clearAuthData()
    setLoading(false)
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
