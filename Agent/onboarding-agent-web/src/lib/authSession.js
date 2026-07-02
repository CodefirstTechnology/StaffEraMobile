import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

let refreshPromise = null
const refreshSubscribers = []

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback)
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(null, token))
  refreshSubscribers.length = 0
}

function onRefreshFailed(error) {
  refreshSubscribers.forEach((cb) => cb(error, null))
  refreshSubscribers.length = 0
}

export function isAccessTokenExpired(token, skewMs = 60_000) {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload?.exp) return true
    return payload.exp * 1000 <= Date.now() + skewMs
  } catch {
    return true
  }
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  if (refreshPromise) {
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((error, token) => {
        if (error) reject(error)
        else resolve(token)
      })
    })
  }

  refreshPromise = axios
    .post(`${API_BASE}/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      const nextAccess = data.data.accessToken
      const nextRefresh = data.data.refreshToken
      localStorage.setItem('accessToken', nextAccess)
      localStorage.setItem('refreshToken', nextRefresh)
      onRefreshed(nextAccess)
      return nextAccess
    })
    .catch((error) => {
      onRefreshFailed(error)
      throw error
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

export async function ensureValidAccessToken() {
  const accessToken = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return accessToken
  }

  if (!refreshToken) {
    throw new Error('Session expired')
  }

  return refreshAccessToken()
}
