import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { useSessions } from '../hooks/useSessions'
import { createSession } from '../api/sessions'
import { useAuthStore } from '../store/auth'
import { decodeJwt, nameFromEmail } from '../lib/jwt'
import { Topbar } from '../components/Topbar'
import { Icon, Pill } from '../components/ui/Icon'
import {
  DAY_LABEL,
  DAY_ORDER,
  TYPE_COLOR,
  TYPE_LABEL,
  todayDow,
  workoutLabel,
  ymd,
} from '../lib/workoutMeta'
import {
  SESSION_WINDOW,
  currentStreak,
  completedInLastDays,
  completedThisWeek,
} from '../lib/stats'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Working late'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: plan } = useWeeklyPlan()
  // Same window as the profile, so both screens share one cached fetch and
  // cannot disagree about the streak.
  const { data: recent } = useSessions({ limit: SESSION_WINDOW })
  const [starting, setStarting] = useState(false)

  const accessToken = useAuthStore((s) => s.accessToken)
  const email = decodeJwt(accessToken)?.email ?? ''
  const displayName = email ? nameFromEmail(email) : 'Coach'

  const dow = todayDow()
  const today = plan?.days?.find((d) => d.dayOfWeek === dow)
  const sessions = useMemo(() => recent?.data ?? [], [recent])

  const streakDays = useMemo(() => currentStreak(sessions), [sessions])
  const weekDone = useMemo(() => completedThisWeek(sessions).length, [sessions])
  const lastFortnight = useMemo(
    () => completedInLastDays(sessions, 14).length,
    [sessions],
  )

  const handleStart = async () => {
    if (starting) return
    setStarting(true)
    try {
      const session = await createSession({
        templateDayId: today?.id,
        date: ymd(new Date()),
        idempotencyKey: uuidv4(),
      })
      navigate(`/session/${session.id}`)
    } finally {
      setStarting(false)
    }
  }

  const isKickbox = today?.workoutType === 'kickboxing'
  const todayExercises = today?.templateExercises ?? []
  const todayRounds = today?.templateRounds ?? []
  const sets = todayExercises.reduce((n, e) => n + e.defaultSets, 0)
  const estMin = isKickbox
    ? todayRounds.length * 3 + 5
    : todayExercises.length * 8

  const dateLong = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <Topbar
        title={`${greeting()}, ${displayName}`}
        sub={dateLong}
        right={
          <button
            className="iconbtn ghost"
            onClick={() => navigate('/profile')}
            aria-label="Profile"
          >
            <Icon name="user" size={20} />
          </button>
        }
      />

      {/* Hero */}
      <section className="hero">
        <div className="hero-meta">
          {today && (
            <Pill color={TYPE_COLOR[today.workoutType] ?? 'var(--accent)'}>
              {TYPE_LABEL[today.workoutType] ?? today.workoutType}
            </Pill>
          )}
          <span className="hero-meta-dot">·</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            {today ? `~${estMin} min` : 'Rest day'}
          </span>
        </div>
        <h2 className="hero-title">{today ? workoutLabel(today) : 'Rest'}</h2>
        <p className="hero-sub">
          {today
            ? isKickbox
              ? `${todayRounds.length} rounds · quality over quantity`
              : `${todayExercises.length} exercises · ${sets} sets`
            : 'No workout scheduled today'}
        </p>
        <div className="hero-actions">
          <button
            className="btn primary"
            onClick={handleStart}
            disabled={starting || !today}
          >
            <Icon name="play" size={16} />{' '}
            {starting ? 'Starting…' : 'Start session'}
          </button>
          <button className="btn ghost" onClick={() => navigate('/profile')}>
            Customize
          </button>
        </div>
        {streakDays > 0 && (
          <div className="hero-corner">
            <div className="hero-corner-row">
              <Icon name="flame" size={14} /> {streakDays}-day streak
            </div>
          </div>
        )}
      </section>

      {/* Quick stats */}
      <div className="row-3">
        <div className="card">
          <div className="stat-num">
            {weekDone}
            <span className="unit">/7</span>
          </div>
          <div className="stat-lbl">this week</div>
        </div>
        <div className="card">
          <div className="stat-num">{lastFortnight}</div>
          <div className="stat-lbl">14-day</div>
        </div>
        <div className="card">
          <div className="stat-num">
            {streakDays}
            <span className="unit">d</span>
          </div>
          <div className="stat-lbl">streak</div>
        </div>
      </div>

      {/* Week rail */}
      <section className="section">
        <div className="section-head">
          <h3>This week</h3>
          <button className="link" onClick={() => navigate('/progress')}>
            Full plan
          </button>
        </div>
        <div className="weekrail">
          {DAY_ORDER.map((d) => {
            const day = plan?.days?.find((x) => x.dayOfWeek === d)
            const isToday = d === dow
            const type = day?.workoutType
            return (
              <div key={d} className={`weekday${isToday ? ' today' : ''}`}>
                <div className="weekday-day">{DAY_LABEL[d]}</div>
                <div
                  className="weekday-dot"
                  style={{
                    background: type ? TYPE_COLOR[type] : 'transparent',
                    borderColor: type ? TYPE_COLOR[type] : 'var(--line-2)',
                  }}
                />
                <div className="weekday-lbl">
                  {day ? workoutLabel(day).split('·')[0].trim() : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* AI insight */}
      <section className="section">
        <div className="section-head">
          <h3>Coach insight</h3>
          <button className="link" onClick={() => navigate('/feedback')}>
            All
          </button>
        </div>
        <div className="card insight" onClick={() => navigate('/feedback')}>
          <div className="insight-tag">
            <Icon name="spark" size={14} /> AI · 14-day review
          </div>
          <p className="insight-text">
            {lastFortnight >= 3 ? (
              <>
                You've trained <b>{lastFortnight} times</b> in 14 days. Open AI
                Coach to generate your personalized review.
              </>
            ) : (
              <>
                Log a few sessions, then generate your first{' '}
                <b>AI coaching review</b> for personalized insights.
              </>
            )}
          </p>
          <div className="insight-foot">
            <span>Tap to open</span>
            <Icon name="fwd" size={16} stroke={2.4} />
          </div>
        </div>
      </section>
    </>
  )
}
