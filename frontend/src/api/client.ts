import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { useAuthStore } from '../store/auth'
import { enqueue } from '../offline/queue'
import { shouldQueue } from '../offline/shouldQueue'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Set by the queue drain so a failed replay is never re-queued. */
    __isReplay?: boolean
  }
}

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

// Axios has already serialized the payload by the time an interceptor sees it.
// Store it as structured data so the replay can re-send it as JSON.
function parseRequestBody(data: unknown): unknown {
  if (typeof data !== 'string') return data ?? null
  try {
    return JSON.parse(data)
  } catch {
    return data
  }
}

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

    // Offline: the network never answered. Park the mutation and let the
    // caller carry on — main.tsx drains the queue when connectivity returns.
    // Without this the queue could never fill and the logger's finish button
    // failed silently, losing the session.
    if (shouldQueue(error)) {
      await enqueue({
        id: uuidv4(),
        method: original.method,
        url: original.url,
        body: parseRequestBody(original.data),
      })
      return {
        data: null,
        status: 202,
        statusText: 'Queued offline',
        headers: {},
        config: original,
      }
    }

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
