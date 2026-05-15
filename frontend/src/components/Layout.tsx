import { Outlet, NavLink } from 'react-router-dom'
import { useSyncStatus } from '../hooks/useSyncStatus'

export function Layout() {
  const pending = useSyncStatus()

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      {pending > 0 && (
        <div className="bg-yellow-600 text-xs text-center py-1">
          {pending} session{pending > 1 ? 's' : ''} pending sync...
        </div>
      )}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex justify-around py-2">
        {[
          { to: '/', label: 'Home' },
          { to: '/history', label: 'History' },
          { to: '/progress', label: 'Progress' },
          { to: '/feedback', label: 'AI' },
          { to: '/profile', label: 'Profile' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `text-xs px-3 py-1 rounded ${isActive ? 'text-blue-400' : 'text-gray-400'}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
