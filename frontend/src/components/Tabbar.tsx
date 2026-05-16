import { NavLink } from 'react-router-dom'
import { Icon } from './ui/Icon'
import type { IconName } from './ui/Icon'

const TABS: Array<{ to: string; icon: IconName; label: string; end?: boolean }> = [
  { to: '/',         icon: 'home',    label: 'Home',    end: true },
  { to: '/history',  icon: 'history', label: 'History' },
  { to: '/progress', icon: 'chart',   label: 'Progress' },
  { to: '/feedback', icon: 'spark',   label: 'Coach' },
  { to: '/profile',  icon: 'user',    label: 'You' },
]

export function Tabbar() {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => `tab${isActive ? ' on' : ''}`}
        >
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
