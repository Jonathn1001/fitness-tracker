import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Tabbar } from './Tabbar'
import { Sidebar } from './Sidebar'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { useThemeStore, applyThemeClass } from '../store/theme'
import { Icon } from './ui/Icon'

export function Layout() {
  const pending = useSyncStatus()
  const dark = useThemeStore((s) => s.dark)
  const { pathname } = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inSession = pathname.startsWith('/session/')

  useEffect(() => {
    applyThemeClass(dark)
  }, [dark])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [pathname])

  return (
    <div className="app">
      {/* Sidebar: hidden on mobile via CSS, visible on desktop */}
      <Sidebar />

      {/* Scrollable content area */}
      <div className="scroll" ref={scrollRef}>
        <Outlet />
        <div className="bottom-spacer" />
      </div>

      {pending > 0 && (
        <div className="sync-toast">
          <Icon name="sync" size={16} /> {pending} session{pending > 1 ? 's' : ''} pending sync
        </div>
      )}

      {/* Tabbar: visible on mobile via CSS, hidden on desktop */}
      {!inSession && <Tabbar />}
    </div>
  )
}
