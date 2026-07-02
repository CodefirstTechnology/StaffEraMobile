import axios from 'axios'
import { ensureValidAccessToken, refreshAccessToken } from './authSession'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export function clearAuthSession() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.dispatchEvent(new Event('auth:session-expired'))
}

export function redirectToLogin() {
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}

function isAuthRefreshRequest(config) {
  const url = String(config?.url || '')
  return url.includes('/auth/refresh') || url.includes('/auth/login')
}

api.interceptors.request.use(
  async (config) => {
    if (isAuthRefreshRequest(config)) return config

    const refreshToken = localStorage.getItem('refreshToken')
    const accessToken = localStorage.getItem('accessToken')

    if (!accessToken && !refreshToken) return config

    try {
      const token = await ensureValidAccessToken()
      config.headers.Authorization = `Bearer ${token}`
    } catch {
      const url = String(config?.url || '')
      if (!url.includes('/auth/logout')) {
        clearAuthSession()
        redirectToLogin()
      }
      return Promise.reject(new axios.CanceledError('Session expired'))
    }

    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    if (status !== 401 || !original || original._retry || isAuthRefreshRequest(original)) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      clearAuthSession()
      redirectToLogin()
      return Promise.reject(error)
    }

    original._retry = true

    try {
      const nextAccess = await refreshAccessToken()
      original.headers.Authorization = `Bearer ${nextAccess}`
      return api(original)
    } catch (refreshError) {
      clearAuthSession()
      redirectToLogin()
      return Promise.reject(refreshError)
    }
  },
)

export default api
