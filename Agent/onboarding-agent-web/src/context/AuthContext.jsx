import { createContext, useContext, useEffect, useState } from 'react'
import api, { clearAuthSession } from '../lib/api'
import { ensureValidAccessToken } from '../lib/authSession'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const onSessionExpired = () => setUser(null)
    window.addEventListener('auth:session-expired', onSessionExpired)
    return () => window.removeEventListener('auth:session-expired', onSessionExpired)
  }, [])

  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')

      if (!accessToken && !refreshToken) {
        setLoading(false)
        return
      }

      try {
        await ensureValidAccessToken()
        const res = await api.get('/auth/me')
        setUser(res.data.data.user)
      } catch {
        clearAuthSession()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    setUser(data.data.user)
    return data.data.user
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      await api.post('/auth/logout', { refreshToken })
    } catch {
      /* ignore — session cleared locally regardless */
    }
    clearAuthSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
