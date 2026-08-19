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
    let cancelled = false
    // A confirmed 401 means genuinely logged out. Anything else — a network
    // blip, cold start, or a moment of downtime while the server redeploys —
    // isn't proof of that, so retry a few times before dropping to the login
    // screen; otherwise every brief hiccup looks like getting logged out.
    const checkAuth = async (attempt = 0) => {
      try {
        const data = await api.get('/auth/me')
        if (!cancelled) setUser(data.user)
      } catch (err) {
        const status = err instanceof Error ? (err as Error & { status?: number }).status : undefined
        if (status !== 401 && attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
          if (!cancelled) return checkAuth(attempt + 1)
          return
        }
        if (!cancelled) setUser(null)
      }
      if (!cancelled) setLoading(false)
    }
    checkAuth()
    return () => {
      cancelled = true
    }
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
