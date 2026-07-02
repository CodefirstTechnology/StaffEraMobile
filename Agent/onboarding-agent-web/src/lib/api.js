import axios from 'axios'

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

let refreshPromise = null

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    if (status !== 401 || !original || original._retry) {
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
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
          .finally(() => {
            refreshPromise = null
          })
      }

      const { data } = await refreshPromise
      const nextAccess = data.data.accessToken
      const nextRefresh = data.data.refreshToken

      localStorage.setItem('accessToken', nextAccess)
      localStorage.setItem('refreshToken', nextRefresh)
      original.headers.Authorization = `Bearer ${nextAccess}`
      return api(original)
    } catch {
      clearAuthSession()
      redirectToLogin()
      return Promise.reject(error)
    }
  },
)

export default api
