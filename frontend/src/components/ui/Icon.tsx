import type { CSSProperties } from 'react'

export type IconName =
  | 'home' | 'history' | 'chart' | 'spark' | 'user' | 'play' | 'check'
  | 'plus' | 'minus' | 'back' | 'fwd' | 'more' | 'flame' | 'dumbbell' | 'trend'
  | 'search' | 'bell' | 'cmd' | 'trophy' | 'settings' | 'win' | 'warn'
  | 'info' | 'phone' | 'logout' | 'moon' | 'sun' | 'sync' | 'calendar'
  | 'cloud' | 'boxing'

interface Props {
  name: IconName
  size?: number
  stroke?: number
  style?: CSSProperties
  className?: string
}

export function Icon({ name, size = 18, stroke = 1.8, style, className }: Props) {
  const c = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    style, className,
  }
  switch (name) {
    case 'home':     return <svg {...c}><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>
    case 'history':  return <svg {...c}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>
    case 'chart':    return <svg {...c}><path d="M4 20V6"/><path d="M4 20h16"/><path d="M8 16l4-5 3 3 5-7"/></svg>
    case 'spark':    return <svg {...c}><path d="M12 3v3M12 18v3M5 12H2M22 12h-3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2"/></svg>
    case 'user':     return <svg {...c}><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>
    case 'play':     return <svg {...c}><path d="M7 5v14l12-7z" fill="currentColor" stroke="none"/></svg>
    case 'check':    return <svg {...c}><path d="M4 12l5 5L20 6"/></svg>
    case 'plus':     return <svg {...c}><path d="M12 5v14M5 12h14"/></svg>
    case 'minus':    return <svg {...c}><path d="M5 12h14"/></svg>
    case 'back':     return <svg {...c}><path d="M15 6l-6 6 6 6"/></svg>
    case 'fwd':      return <svg {...c}><path d="M9 6l6 6-6 6"/></svg>
    case 'more':     return <svg {...c}><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>
    case 'flame':    return <svg {...c}><path d="M12 3c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 2-4-1 4 2 4 2 0 0-2 0-3 0-4z"/></svg>
    case 'dumbbell': return <svg {...c}><path d="M3 9v6M6 7v10M9 9h6M18 7v10M21 9v6"/></svg>
    case 'boxing':   return <svg {...c}><path d="M7 8c0-2 2-3 5-3s5 1 5 3v4l-2 2v4H9v-4l-2-2V8z"/><path d="M9 12h6"/></svg>
    case 'trend':    return <svg {...c}><path d="M3 17l6-6 4 4 8-9"/><path d="M14 6h7v7"/></svg>
    case 'sync':     return <svg {...c}><path d="M4 12a8 8 0 0 1 14-5"/><path d="M20 12a8 8 0 0 1-14 5"/><path d="M18 3v5h-5"/><path d="M6 21v-5h5"/></svg>
    case 'calendar': return <svg {...c}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
    case 'cloud':    return <svg {...c}><path d="M7 18a4 4 0 1 1 .5-7.97A6 6 0 0 1 19 12a4 4 0 0 1-1 7.83"/></svg>
    case 'search':   return <svg {...c}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    case 'bell':     return <svg {...c}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
    case 'cmd':      return <svg {...c}><path d="M9 9h6v6H9z"/><path d="M9 9a3 3 0 1 1-3-3M9 9V6a3 3 0 1 0-3 3M15 9V6a3 3 0 1 1 3 3M15 9h3a3 3 0 1 1-3 3M15 15v3a3 3 0 1 0 3-3M15 15h3M9 15H6a3 3 0 1 0 3 3M9 15v3"/></svg>
    case 'trophy':   return <svg {...c}><path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M5 4h3v3a3 3 0 0 1-3-3z"/><path d="M19 4h-3v3a3 3 0 0 0 3-3z"/><path d="M9 14h6v3H9z"/><path d="M7 20h10"/></svg>
    case 'settings': return <svg {...c}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
    case 'win':      return <svg {...c}><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>
    case 'warn':     return <svg {...c}><path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18v.5"/></svg>
    case 'info':     return <svg {...c}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/></svg>
    case 'phone':    return <svg {...c}><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 19h2"/></svg>
    case 'logout':   return <svg {...c}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h12"/></svg>
    case 'moon':     return <svg {...c}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
    case 'sun':      return <svg {...c}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    default: return null
  }
}

export function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="pill"
      style={{
        background: `color-mix(in oklch, ${color} 18%, transparent)`,
        color,
        borderColor: `color-mix(in oklch, ${color} 35%, transparent)`,
      }}
    >
      {children}
    </span>
  )
}
