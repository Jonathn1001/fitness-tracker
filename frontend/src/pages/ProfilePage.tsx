import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { useSessions } from '../hooks/useSessions'
import { logout } from '../api/auth'
import { useAuthStore } from '../store/auth'
import { useThemeStore } from '../store/theme'
import { decodeJwt, nameFromEmail } from '../lib/jwt'
import { Topbar } from '../components/Topbar'
import { Icon } from '../components/ui/Icon'
import { TYPE_COLOR, TYPE_LABEL } from '../lib/workoutMeta'

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABEL: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

function ymd(d: Date) { return d.toISOString().split('T')[0] }

const BADGES = [
  { name: 'First session',  icn: '▲', earned: true },
  { name: '7-day streak',   icn: '♦', earned: true },
  { name: '30 sessions',    icn: '■', earned: false },
  { name: 'Bench BW',       icn: '★', earned: false },
  { name: '30-day streak',  icn: '♦', earned: false },
  { name: '100 sessions',   icn: '◆', earned: false },
]

export function ProfilePage() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((s) => s.accessToken)
  const clearToken = useAuthStore((s) => s.clearToken)
  const { dark, toggle } = useThemeStore()
  const { data: plan } = useWeeklyPlan()
  const { data: recent } = useSessions({ limit: 100 })

  const payload = decodeJwt(accessToken)
  const email = payload?.email ?? ''
  const name = email ? nameFromEmail(email) : 'Coach'
  const initial = name[0]?.toUpperCase() ?? 'C'

  const sessions = recent?.data ?? []
  const completed = sessions.filter((s) => s.status === 'completed')

  const streakDays = useMemo(() => {
    const days = new Set(completed.map((s) => ymd(new Date(s.completedAt ?? s.date))))
    let n = 0
    const cur = new Date()
    while (days.has(ymd(cur))) { n++; cur.setDate(cur.getDate() - 1) }
    return n
  }, [completed])

  const totalHours = Math.round(completed.length * 0.85)

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Best-effort: clear local state even if the server call fails.
    }
    clearToken()
    navigate('/login')
  }

  return (
    <>
      <Topbar
        title="Profile"
        right={
          <button className="iconbtn ghost" onClick={toggle} aria-label="Toggle theme">
            <Icon name={dark ? 'sun' : 'moon'} size={20} />
          </button>
        }
      />

      {/* Hero */}
      <div className="card profile-hero-m">
        <div className="avatar-lg">{initial}</div>
        <div className="profile-name">{name}</div>
        <div className="profile-handle">{email}</div>
        <p className="profile-bio">Tracking gym and kickboxing sessions.</p>
        <span className="profile-pro">★ Coach · active</span>
      </div>

      {/* Stats 2×2 */}
      <div className="stat-2x2">
        <div className="card">
          <div className="stat-num">{completed.length}</div>
          <div className="stat-lbl">Sessions</div>
          <div className="stat-sub">{completed.length > 0 ? 'total logged' : 'start today'}</div>
        </div>
        <div className="card">
          <div className="stat-num">{totalHours}<span className="unit">h</span></div>
          <div className="stat-lbl">Training time</div>
          <div className="stat-sub">~51 min · avg</div>
        </div>
        <div className="card">
          <div className="stat-num">{sessions.length}</div>
          <div className="stat-lbl">Last 14 days</div>
          <div className="stat-sub">sessions logged</div>
        </div>
        <div className="card">
          <div className="stat-num">{streakDays}<span className="unit">d</span></div>
          <div className="stat-lbl">Current streak</div>
          <div className="stat-sub">{streakDays > 0 ? 'keep it going' : 'start today'}</div>
        </div>
      </div>

      {/* Weekly plan */}
      {plan?.days && plan.days.length > 0 && (
        <div className="section">
          <div className="section-head">
            <h3>Weekly plan</h3>
            <span className="dim" style={{ fontSize: 11 }}>{plan.name}</span>
          </div>
          <div className="card rowlist">
            {DAY_ORDER.map((dow) => {
              const day = plan.days?.find((d) => d.dayOfWeek === dow)
              const type = day?.workoutType
              const label = day
                ? type === 'kickboxing'
                  ? 'Heavy Bag'
                  : Array.from(new Set((day.templateExercises ?? []).map((te) => te.exercise.muscleGroup))).slice(0, 2).join(' · ') || 'Workout'
                : 'Rest'
              return (
                <div key={dow} className="planrow">
                  <div className="planrow-day">{DAY_LABEL[dow]}</div>
                  <div className="planrow-body">
                    <div className="planrow-title">{label}</div>
                    {type && <div className="planrow-sub">{TYPE_LABEL[type]}</div>}
                  </div>
                  {type && <div className="planrow-dot" style={{ background: TYPE_COLOR[type] }} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="section">
        <div className="section-head">
          <h3>Achievements</h3>
          <span className="dim" style={{ fontSize: 11 }}>
            {BADGES.filter((b) => b.earned).length} of {BADGES.length}
          </span>
        </div>
        <div className="card">
          <div className="badge-grid-m">
            {BADGES.map((b) => (
              <div key={b.name} className={`badge-m ${b.earned ? 'earned' : 'locked'}`}>
                <div className="badge-m-icn">{b.icn}</div>
                <div className="badge-m-name">{b.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="section">
        <div className="card rowlist">
          <button className="setrow" onClick={toggle}>
            <Icon name={dark ? 'sun' : 'moon'} size={18} />
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
            <Icon name="fwd" size={16} />
          </button>
          <button className="setrow danger" onClick={handleLogout}>
            <Icon name="logout" size={18} />
            <span>Sign out</span>
            <span />
          </button>
        </div>
      </div>
    </>
  )
}
