import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from './ui/Icon'
import { useAuthStore } from '../store/auth'
import { decodeJwt, nameFromEmail } from '../lib/jwt'

const NAV: Array<{ to: string; icon: IconName; label: string; end?: boolean }> = [
  { to: '/',         icon: 'home',    label: 'Dashboard', end: true },
  { to: '/history',  icon: 'history', label: 'History' },
  { to: '/progress', icon: 'chart',   label: 'Progress' },
  { to: '/feedback', icon: 'spark',   label: 'AI Coach' },
]

const ACCOUNT: Array<{ to: string; icon: IconName; label: string }> = [
  { to: '/profile', icon: 'user', label: 'Profile' },
]

export function Sidebar() {
  const token = useAuthStore((s) => s.accessToken)
  const payload = decodeJwt(token)
  const email = payload?.email ?? ''
  const name = email ? nameFromEmail(email) : 'Coach'
  const initial = name[0]?.toUpperCase() ?? 'C'

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">C</div>
        <div>
          <div className="brand-name">Coach</div>
          <div className="brand-sub">Fitness OS</div>
        </div>
      </div>

      <nav className="sidenav">
        <div className="sidenav-group">Main</div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `sidenav-item ${isActive ? 'on' : ''}`}
          >
            <Icon name={n.icon} size={18} />
            <span>{n.label}</span>
          </NavLink>
        ))}
        <div className="sidenav-group">Account</div>
        {ACCOUNT.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => `sidenav-item ${isActive ? 'on' : ''}`}
          >
            <Icon name={n.icon} size={18} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="install-card">
        <div className="install-icn">
          <Icon name="phone" size={18} />
        </div>
        <div>
          <div className="install-title">Install on phone</div>
          <div className="install-sub">Track workouts offline · PWA</div>
        </div>
      </div>

      <div className="profile-pill">
        <div className="profile-pill-avatar">{initial}</div>
        <div>
          <div className="profile-pill-name">{name}</div>
          <div className="profile-pill-mail">{email || 'Not signed in'}</div>
        </div>
      </div>
    </aside>
  )
}
