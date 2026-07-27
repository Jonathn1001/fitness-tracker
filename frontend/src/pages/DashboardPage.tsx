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
import type { TemplateDay } from '../api/types'
import { TYPE_COLOR, TYPE_LABEL } from '../lib/workoutMeta'

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABEL: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

function todayDow() { return DAY_ORDER[(new Date().getDay() + 6) % 7] }

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Working late'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function ymd(d: Date) { return d.toISOString().split('T')[0] }

function prettyLabel(d: Pick<TemplateDay, 'workoutType' | 'templateExercises'>) {
  if (d.workoutType === 'kickboxing') return 'Heavy Bag'
  const groups = new Set((d.templateExercises ?? []).map((te) => te.exercise.muscleGroup))
  if (!groups.size) return 'Workout'
  return Array.from(groups).slice(0, 2).join(' · ')
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: plan } = useWeeklyPlan()
  const { data: recent } = useSessions({ limit: 14 })
  const [starting, setStarting] = useState(false)

  const accessToken = useAuthStore((s) => s.accessToken)
  const email = decodeJwt(accessToken)?.email ?? ''
  const displayName = email ? nameFromEmail(email) : 'Coach'

  const dow = todayDow()
  const today = plan?.days?.find((d) => d.dayOfWeek === dow)
  const sessions = useMemo(() => recent?.data ?? [], [recent])

  const streakDays = useMemo(() => {
    const days = new Set(
      sessions.filter((s) => s.status === 'completed').map((s) => ymd(new Date(s.completedAt ?? s.date))),
    )
    let n = 0
    const cur = new Date()
    while (days.has(ymd(cur))) { n++; cur.setDate(cur.getDate() - 1) }
    return n
  }, [sessions])

  const weekDone = useMemo(() => {
    const monday = new Date()
    monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
    monday.setHours(0, 0, 0, 0)
    return sessions.filter(
      (s) => s.status === 'completed' && new Date(s.completedAt ?? s.date) >= monday,
    ).length
  }, [sessions])

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
  const estMin = isKickbox ? todayRounds.length * 3 + 5 : todayExercises.length * 8

  const dateLong = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <>
      <Topbar
        title={`${greeting()}, ${displayName}`}
        sub={dateLong}
        right={
          <button className="iconbtn ghost" onClick={() => navigate('/profile')} aria-label="Profile">
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
        <h2 className="hero-title">{today ? prettyLabel(today) : 'Rest'}</h2>
        <p className="hero-sub">
          {today
            ? isKickbox
              ? `${todayRounds.length} rounds · quality over quantity`
              : `${todayExercises.length} exercises · ${sets} sets`
            : 'No workout scheduled today'}
        </p>
        <div className="hero-actions">
          <button className="btn primary" onClick={handleStart} disabled={starting || !today}>
            <Icon name="play" size={16} /> {starting ? 'Starting…' : 'Start session'}
          </button>
          <button className="btn ghost" onClick={() => navigate('/profile')}>Customize</button>
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
          <div className="stat-num">{weekDone}<span className="unit">/7</span></div>
          <div className="stat-lbl">this week</div>
        </div>
        <div className="card">
          <div className="stat-num">{sessions.length}</div>
          <div className="stat-lbl">14-day</div>
        </div>
        <div className="card">
          <div className="stat-num">{streakDays}<span className="unit">d</span></div>
          <div className="stat-lbl">streak</div>
        </div>
      </div>

      {/* Week rail */}
      <section className="section">
        <div className="section-head">
          <h3>This week</h3>
          <button className="link" onClick={() => navigate('/progress')}>Full plan</button>
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
                <div className="weekday-lbl">{day ? prettyLabel(day).split('·')[0].trim() : '—'}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* AI insight */}
      <section className="section">
        <div className="section-head">
          <h3>Coach insight</h3>
          <button className="link" onClick={() => navigate('/feedback')}>All</button>
        </div>
        <div className="card insight" onClick={() => navigate('/feedback')}>
          <div className="insight-tag"><Icon name="spark" size={14} /> AI · 14-day review</div>
          <p className="insight-text">
            {sessions.length >= 3
              ? <>You've trained <b>{sessions.length} times</b> in 14 days. Open AI Coach to generate your personalized review.</>
              : <>Log a few sessions, then generate your first <b>AI coaching review</b> for personalized insights.</>}
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
