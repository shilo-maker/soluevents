import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Token refresh dedup — prevent multiple concurrent 401s from triggering parallel refreshes
let refreshPromise: Promise<string> | null = null

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Reuse in-flight refresh if one is already running
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const state = useAuthStore.getState()
            if (!state.isAuthenticated || !state.user || !state.refreshToken) {
              throw new Error('No user session')
            }
            const response = await axios.post('/api/auth/refresh', {
              refresh_token: state.refreshToken,
            })
            const { access_token } = response.data
            // Re-check auth state — user may have logged out while refresh was in-flight
            if (!useAuthStore.getState().isAuthenticated) {
              throw new Error('Logged out during refresh')
            }
            useAuthStore.getState().setAuth(state.user, access_token, state.refreshToken)
            return access_token
          })().finally(() => { refreshPromise = null })
        }

        const access_token = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
