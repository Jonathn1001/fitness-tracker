import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { Topbar } from '../components/Topbar'
import { Icon, Pill } from '../components/ui/Icon'
import type { WorkoutType } from '../api/types'

const TYPE_COLOR: Record<string, string> = { gym: 'var(--accent)', kickboxing: 'var(--accent-2)' }
const TYPE_LABEL: Record<string, string> = { gym: 'Strength', kickboxing: 'Kickbox' }

type Filter = 'all' | 'gym' | 'kickboxing'

export function HistoryPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [range, setRange] = useState<'30d' | '90d'>('30d')

  const from = useMemo(() => {
    const days = range === '30d' ? 30 : 90
    return new Date(Date.now() - days * 864e5).toISOString().split('T')[0]
  }, [range])

  const { data, isLoading } = useSessions({ from, limit: 100 })
  const { data: plan } = useWeeklyPlan()
  const all = data?.data ?? []

  const enriched = all.map((s) => {
    const day = plan?.days?.find((d) => d.id === s.templateDayId)
    const type: WorkoutType = day?.workoutType ?? 'gym'
    const label = day
      ? type === 'kickboxing'
        ? 'Heavy Bag'
        : Array.from(new Set((day.templateExercises ?? []).map((te) => te.exercise.muscleGroup))).slice(0, 2).join(' · ') || 'Workout'
      : 'Session'
    return { ...s, _type: type, _label: label }
  })

  const list = enriched.filter((s) => filter === 'all' || s._type === filter)

  return (
    <>
      <Topbar
        title="History"
        sub={`Last ${range === '30d' ? '30' : '90'} days`}
        right={
          <button className="iconbtn ghost" onClick={() => setRange(range === '30d' ? '90d' : '30d')} aria-label="Change range">
            <Icon name="calendar" size={20} />
          </button>
        }
      />

      <div className="seg">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
        <button className={filter === 'gym' ? 'on' : ''} onClick={() => setFilter('gym')}>Strength</button>
        <button className={filter === 'kickboxing' ? 'on' : ''} onClick={() => setFilter('kickboxing')}>Kickbox</button>
      </div>

      {isLoading ? (
        <p className="dim" style={{ fontSize: 13 }}>Loading…</p>
      ) : list.length === 0 ? (
        <p className="dim" style={{ fontSize: 13 }}>No sessions in this range.</p>
      ) : (
        <div className="histlist">
          {list.map((s) => {
            const date = new Date(s.completedAt ?? s.date)
            const dateStr = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
            return (
              <div
                key={s.id}
                className="card hist"
                onClick={() => navigate(`/session/${s.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="hist-bar" style={{ background: TYPE_COLOR[s._type] }} />
                <div className="hist-body">
                  <div className="hist-top">
                    <div className="hist-date">{dateStr}</div>
                    <Pill color={TYPE_COLOR[s._type]}>{TYPE_LABEL[s._type]}</Pill>
                  </div>
                  <div className="hist-title">{s._label}</div>
                  <div className="hist-meta">
                    <span><Icon name="dumbbell" size={13} /> {s.status === 'completed' ? 'Completed' : 'In progress'}</span>
                  </div>
                </div>
                <button className="iconbtn ghost" aria-label="Open" onClick={(e) => { e.stopPropagation(); navigate(`/session/${s.id}`) }}>
                  <Icon name="more" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
