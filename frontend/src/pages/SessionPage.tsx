import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { GymLogger } from '../components/GymLogger'
import { KickboxingLogger } from '../components/KickboxingLogger'
import { deleteSession, updateSession } from '../api/sessions'
import { Topbar } from '../components/Topbar'
import { Icon, Pill } from '../components/ui/Icon'
import { TYPE_COLOR, TYPE_LABEL, workoutLabel } from '../lib/workoutMeta'

export function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading } = useSession(id!)
  const navigate = useNavigate()
  const [warmupMin, setWarmupMin] = useState(8)
  const [warmupKind, setWarmupKind] = useState<'walk' | 'run'>('walk')
  const [notes, setNotes] = useState('')
  const [tab, setTab] = useState<'warmup' | 'lifts'>('warmup')

  if (isLoading) {
    return (
      <>
        <Topbar title="Loading…" onBack={() => navigate('/')} />
        <p className="dim" style={{ fontSize: 13, padding: '0 var(--pad)' }}>
          Please wait.
        </p>
      </>
    )
  }

  if (!session) {
    return (
      <>
        <Topbar title="Session not found" onBack={() => navigate('/')} />
        <div style={{ padding: '0 var(--pad)' }}>
          <button className="btn ghost-dark full" onClick={() => navigate('/')}>
            ← Dashboard
          </button>
        </div>
      </>
    )
  }

  const workoutType = (session.templateDay?.workoutType ?? 'gym') as
    'gym' | 'kickboxing'
  const isKickbox = workoutType === 'kickboxing'

  const handleDiscard = async () => {
    if (!confirm('Discard this session?')) return
    await deleteSession(id!)
    navigate('/')
  }

  const exercises = (session.templateDay?.templateExercises ?? []).map(
    (te) => ({
      id: te.exercise.id,
      name: te.exercise.name,
      muscleGroup: te.exercise.muscleGroup,
      defaultSets: te.defaultSets,
      defaultReps: te.defaultReps,
      defaultWeightKg: te.defaultWeightKg,
    }),
  )

  const rounds = (session.templateDay?.templateRounds ?? []).map((tr) => ({
    id: tr.id,
    roundNumber: tr.roundNumber,
    roundType: tr.roundType,
  }))

  const title = workoutLabel(session.templateDay, 'Workout')

  const sub = `${TYPE_LABEL[workoutType]} · ${new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`

  if (session.status === 'completed') {
    return (
      <>
        <Topbar title={title} sub={sub} onBack={() => navigate('/history')} />
        <div
          className="card"
          style={{ margin: '0 0 18px', padding: 32, textAlign: 'center' }}
        >
          <Pill color={TYPE_COLOR[workoutType]}>
            {TYPE_LABEL[workoutType]} · completed
          </Pill>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '16px 0 8px',
            }}
          >
            Session complete
          </h2>
          <p className="dim" style={{ fontSize: 13 }}>
            Your data is saved — review it any time from History or Progress.
          </p>
          <button
            className="btn ghost-dark full"
            style={{ marginTop: 20 }}
            onClick={() => navigate('/history')}
          >
            View history
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title={title}
        sub={sub}
        onBack={() => navigate('/')}
        right={
          <button
            className="iconbtn ghost"
            onClick={handleDiscard}
            aria-label="Discard"
          >
            <Icon name="more" size={20} />
          </button>
        }
      />

      {!isKickbox && (
        <div className="seg">
          <button
            className={tab === 'warmup' ? 'on' : ''}
            onClick={() => setTab('warmup')}
          >
            Warmup
          </button>
          <button
            className={tab === 'lifts' ? 'on' : ''}
            onClick={() => setTab('lifts')}
          >
            Lifts
          </button>
        </div>
      )}

      {!isKickbox && tab === 'warmup' && (
        <div className="card warmup-card">
          <div className="warmup-row">
            <div className="warmup-toggle">
              <button
                className={warmupKind === 'walk' ? 'on' : ''}
                onClick={() => setWarmupKind('walk')}
              >
                Walk
              </button>
              <button
                className={warmupKind === 'run' ? 'on' : ''}
                onClick={() => setWarmupKind('run')}
              >
                Run
              </button>
            </div>
          </div>
          <div className="warmup-min">
            <button
              className="iconbtn"
              onClick={() => setWarmupMin((m) => Math.max(0, m - 1))}
            >
              <Icon name="minus" size={18} />
            </button>
            <div className="big-num">
              {warmupMin}
              <span className="unit">min</span>
            </div>
            <button
              className="iconbtn"
              onClick={() => setWarmupMin((m) => m + 1)}
            >
              <Icon name="plus" size={18} />
            </button>
          </div>
          <textarea
            className="notes"
            style={{ width: '100%' }}
            placeholder="Session notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() =>
              updateSession(id!, {
                notes,
                warmupType: warmupKind,
                warmupDurationMin: warmupMin,
              })
            }
          />
          <button className="btn primary full" onClick={() => setTab('lifts')}>
            Done — start lifting
          </button>
        </div>
      )}

      {!isKickbox && tab === 'lifts' && (
        <GymLogger sessionId={session.id} exercises={exercises} />
      )}

      {isKickbox && <KickboxingLogger sessionId={session.id} rounds={rounds} />}
    </>
  )
}
