import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useSessions } from '../hooks/useSessions'
import { getSession } from '../api/sessions'
import { Topbar } from '../components/Topbar'
import { Icon } from '../components/ui/Icon'
import type { SessionDetail } from '../api/types'

type DS = Pick<SessionDetail, 'id' | 'date' | 'templateDay' | 'sessionSets' | 'sessionRounds'>

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']

function buildTrend(sessions: DS[], exerciseName: string) {
  return sessions
    .filter((s) => s.templateDay?.workoutType === 'gym')
    .flatMap((s) => {
      const top = s.sessionSets.filter((ss) => ss.exercise.name === exerciseName).map((ss) => ss.weightKg)
      return top.length ? [Math.max(...top)] : []
    })
}

function buildKbQuality(sessions: DS[]) {
  return sessions
    .filter((s) => s.templateDay?.workoutType === 'kickboxing')
    .flatMap((s) => {
      const rated = s.sessionRounds.filter((r) => r.qualityRating)
      return rated.length ? [rated.reduce((a, b) => a + (b.qualityRating ?? 0), 0) / rated.length] : []
    })
}

function buildMuscleVolume(sessions: DS[]) {
  const totals = new Map<string, number>()
  const maxes = new Map<string, number>()
  for (const s of sessions) {
    if (s.templateDay?.workoutType !== 'gym') continue
    for (const ss of s.sessionSets) {
      const mg = ss.exercise.muscleGroup
      const vol = ss.reps * ss.weightKg
      totals.set(mg, (totals.get(mg) ?? 0) + vol)
      maxes.set(mg, Math.max(maxes.get(mg) ?? 0, vol))
    }
  }
  return totals
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <p className="dim" style={{ fontSize: 13, margin: '12px 0' }}>Not enough data yet.</p>
  const w = 320, h = 110, pad = 12
  const min = Math.min(...data) * 0.95
  const max = Math.max(...data) * 1.02
  const range = max - min || 1
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (w - pad * 2),
    h - pad - ((v - min) / range) * (h - pad * 2),
  ])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${d} L${pts[pts.length - 1][0]} ${h - pad} L${pts[0][0]} ${h - pad} Z`
  const gid = `pg-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={pad} x2={w - pad} y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)} stroke="var(--line)" strokeDasharray="2 4" />
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 0} fill={color} />
      ))}
    </svg>
  )
}

type Metric = 'bench' | 'squat' | 'kb'

export function ProgressPage() {
  const [metric, setMetric] = useState<Metric>('bench')
  const { data: recent } = useSessions({ limit: 30 })
  const ids = (recent?.data ?? []).map((s) => s.id)

  const detailQueries = useQueries({
    queries: ids.slice(0, 20).map((id) => ({
      queryKey: ['session', id],
      queryFn: () => getSession(id),
      staleTime: 1000 * 60 * 10,
    })),
  })

  const sessions = useMemo<DS[]>(
    () => detailQueries.flatMap((q) => (q.data ? [q.data] : [])).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [detailQueries],
  )

  const bench = useMemo(() => buildTrend(sessions, 'Bench Press'), [sessions])
  const squat = useMemo(() => buildTrend(sessions, 'Back Squat'), [sessions])
  const kb    = useMemo(() => buildKbQuality(sessions), [sessions])
  const muscleVol = useMemo(() => buildMuscleVolume(sessions), [sessions])

  const series = {
    bench: { data: bench, label: 'Bench Press', unit: 'kg',  color: 'var(--accent)' },
    squat: { data: squat, label: 'Back Squat',  unit: 'kg',  color: 'var(--accent)' },
    kb:    { data: kb,    label: 'Round quality avg', unit: '/5', color: 'var(--accent-2)' },
  }
  const s = series[metric]
  const last = s.data[s.data.length - 1] ?? 0
  const first = s.data[0] ?? 0
  const delta = (last - first).toFixed(1)

  const maxVol = Math.max(...MUSCLE_GROUPS.map((mg) => muscleVol.get(mg) ?? 0), 1)

  const prs = [
    bench.length ? { name: 'Bench Press', v: `${Math.max(...bench)} kg` } : null,
    squat.length ? { name: 'Back Squat',  v: `${Math.max(...squat)} kg` } : null,
    kb.length    ? { name: 'Round quality', v: `${Math.max(...kb).toFixed(1)} / 5` } : null,
  ].filter(Boolean) as { name: string; v: string }[]

  return (
    <>
      <Topbar
        title="Progress"
        sub="8-week trend"
        right={
          <button className="iconbtn ghost" aria-label="Calendar">
            <Icon name="calendar" size={20} />
          </button>
        }
      />

      <div className="seg">
        <button className={metric === 'bench' ? 'on' : ''} onClick={() => setMetric('bench')}>Bench</button>
        <button className={metric === 'squat' ? 'on' : ''} onClick={() => setMetric('squat')}>Squat</button>
        <button className={metric === 'kb'    ? 'on' : ''} onClick={() => setMetric('kb')}>Kickbox</button>
      </div>

      <div className="card chart-card">
        <div className="chart-head">
          <div>
            <div className="chart-lbl">{s.label}</div>
            <div className="big-num" style={{ fontSize: 36, minWidth: 'auto' }}>
              {last || '—'}<span className="unit">{s.unit}</span>
            </div>
          </div>
          {s.data.length >= 2 && (
            <div className="chart-delta" style={{ color: s.color }}>
              <Icon name="trend" size={14} /> {Number(delta) >= 0 ? '+' : ''}{delta}{s.unit}
            </div>
          )}
        </div>
        <MiniChart data={s.data} color={s.color === 'var(--accent)' ? '#C8FF3E' : '#FF7A59'} />
        {s.data.length >= 2 && (
          <div className="chart-axis">
            <span>Start</span><span>→</span><span>Now</span>
          </div>
        )}
      </div>

      {prs.length > 0 && (
        <section className="section">
          <h3>Personal records</h3>
          <div className="pr-list">
            {prs.map((p) => (
              <div key={p.name} className="card pr">
                <div className="pr-icn"><Icon name="trophy" size={18} /></div>
                <div className="pr-body">
                  <div className="pr-name">{p.name}</div>
                  <div className="pr-date">All-time best</div>
                </div>
                <div className="pr-v mono">{p.v}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h3>Muscle coverage · last 30d</h3>
        <div className="card cov">
          {MUSCLE_GROUPS.map((mg) => {
            const vol = muscleVol.get(mg) ?? 0
            const pct = maxVol ? vol / maxVol : 0
            return (
              <div key={mg} className="cov-row">
                <span className="cov-lbl">{mg}</span>
                <div className="cov-bar">
                  <div className="cov-fill" style={{ width: `${pct * 100}%`, background: pct < 0.25 ? 'var(--accent-2)' : 'var(--accent)' }} />
                </div>
                <span className="cov-v mono">{Math.round(pct * 100)}%</span>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
