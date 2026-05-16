import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuthStore } from '../store/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setToken = useAuthStore((s) => s.setToken)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await login({ email, password })
      setToken(data.accessToken)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="brand" style={{ marginBottom: 22, padding: 0 }}>
          <div className="brand-mark">C</div>
          <div>
            <div className="brand-name">Coach</div>
            <div className="brand-sub">Fitness OS</div>
          </div>
        </div>
        <h1>Welcome back</h1>
        <p className="dim">Sign in to track today's session.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary full" disabled={loading}>
            {loading ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
          </button>
        </form>

        <p className="dim" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 16 }}>
          No account? <Link to="/signup" style={{ color: 'var(--ink)', fontWeight: 700 }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
