import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/auth'
import { BASE_URL } from '../api/client'

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken)
  const setToken = useAuthStore((s) => s.setToken)
  const [checking, setChecking] = useState(token === null)

  useEffect(() => {
    if (token) {
      setChecking(false)
      return
    }
    let cancelled = false
    axios
      .post<{ accessToken: string }>(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        if (!cancelled) setToken(res.data.accessToken)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, setToken])

  if (checking) return null
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
