import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/auth'
import { BASE_URL } from '../api/client'

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken)
  const setToken = useAuthStore((s) => s.setToken)
  const [refreshFailed, setRefreshFailed] = useState(false)

  useEffect(() => {
    if (token) return
    let cancelled = false
    axios
      .post<{ accessToken: string }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then((res) => {
        if (!cancelled) setToken(res.data.accessToken)
      })
      .catch(() => {
        if (!cancelled) setRefreshFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [token, setToken])

  if (token) return <Outlet />
  if (refreshFailed) return <Navigate to="/login" replace />
  return null
}
