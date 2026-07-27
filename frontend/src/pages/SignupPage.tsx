import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { signup } from '../api/auth'
import { useAuthStore } from '../store/auth'

export function SignupPage() {
  const [name, setName] = useState('')
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
      const { data } = await signup({ name, email, password })
      setToken(data.accessToken)
      navigate('/')
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined
      setError(message ?? 'Signup failed')
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
        <h1>Create account</h1>
        <p className="dim">Start tracking sessions in under a minute.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={10}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}"
              title="At least 10 characters, with an uppercase letter, a lowercase letter and a digit"
              required
              autoComplete="new-password"
              aria-describedby="password-hint"
            />
            {/* Mirrors SignupDto on the API: MinLength(10) + upper + lower + digit. */}
            <p id="password-hint" className="dim" style={{ fontSize: 12, marginTop: 6 }}>
              At least 10 characters, with an uppercase letter, a lowercase letter and a digit.
            </p>
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary full" disabled={loading}>
            {loading ? <><span className="spinner" /> Creating…</> : 'Create account'}
          </button>
        </form>

        <p className="dim" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 16 }}>
          Already have one? <Link to="/login" style={{ color: 'var(--ink)', fontWeight: 700 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
