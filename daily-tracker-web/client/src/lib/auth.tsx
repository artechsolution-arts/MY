import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'

type User = { id: string; email: string }

type AuthState = {
  user: User | null
  loading: boolean
  signup: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const signup = async (email: string, password: string) => {
    const data = await api.post('/auth/signup', { email, password })
    setUser(data.user)
  }

  const login = async (email: string, password: string) => {
    const data = await api.post('/auth/login', { email, password })
    setUser(data.user)
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, signup, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
