import axios from 'axios'
import { useAuthStore } from '../store/auth'

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

let onUnauthorized: () => void = () => {
  window.location.href = '/login'
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

interface Waiter {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}

let isRefreshing = false
let waiters: Waiter[] = []

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waiters.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(original))
          },
          reject,
        })
      })
    }

    isRefreshing = true
    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      useAuthStore.getState().setToken(data.accessToken)
      const drained = waiters
      waiters = []
      drained.forEach((w) => w.resolve(data.accessToken))
      original.headers.Authorization = `Bearer ${data.accessToken}`
      return apiClient(original)
    } catch (refreshError) {
      const drained = waiters
      waiters = []
      drained.forEach((w) => w.reject(refreshError))
      useAuthStore.getState().clearToken()
      onUnauthorized()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)
