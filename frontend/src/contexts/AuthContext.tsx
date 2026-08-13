import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import api from '../lib/api'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

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
  const [user, setUser] = useState<any>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEmployee = useCallback(async (accessToken: string) => {
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      const res = await api.get('/auth/me')
      setEmployee(res.data.employee)
    } catch (err) {
      console.error('Failed to fetch employee profile:', err)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        setToken(session.access_token)
        fetchEmployee(session.access_token).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
        setToken(session.access_token)
        api.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`
        fetchEmployee(session.access_token)
      } else {
        setUser(null)
        setEmployee(null)
        setToken(null)
        delete api.defaults.headers.common['Authorization']
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchEmployee])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { session, employee: emp } = res.data
    await supabase.auth.setSession(session)
    setUser(session.user)
    setToken(session.access_token)
    setEmployee(emp)
    api.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    await supabase.auth.signOut()
    setUser(null)
    setEmployee(null)
    setToken(null)
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
