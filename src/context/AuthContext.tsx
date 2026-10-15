import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '../api/auth'
import { clearTokens, storeTokens } from '@/api/client'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signInWithTokens: (user: User, accessToken: string, refreshToken?: string) => void
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.me()
      .then(res => setUser(res.data.user))
      .catch(err => {
        // A token that could not be renewed is useless; drop it.
        if ([401, 422].includes(err?.response?.status)) clearTokens()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const res = await authApi.login({ username, password })
    storeTokens(res.data.access_token, (res.data as { refresh_token?: string }).refresh_token)
    setUser(res.data.user)
  }

  const signInWithTokens = (user: User, accessToken: string, refreshToken?: string) => {
    storeTokens(accessToken, refreshToken)
    setUser(user)
  }

  const logout = async () => {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, signInWithTokens }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
