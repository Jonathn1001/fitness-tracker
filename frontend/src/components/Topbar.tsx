import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './ui/Icon'

interface Props {
  title: string
  sub?: string
  right?: ReactNode
  onBack?: () => void
}

export function Topbar({ title, sub, right, onBack }: Props) {
  const navigate = useNavigate()

  const handleBack = onBack ?? (() => navigate(-1))

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onBack !== undefined && (
          <button className="iconbtn" onClick={handleBack} aria-label="Back">
            <Icon name="back" />
          </button>
        )}
        <div>
          {sub && <div className="topbar-sub">{sub}</div>}
          <h1 className="topbar-title">{title}</h1>
        </div>
      </div>
      {right && <div className="topbar-right">{right}</div>}
    </header>
  )
}
