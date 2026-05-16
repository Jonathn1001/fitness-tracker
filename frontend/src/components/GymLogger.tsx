import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { upsertSets, completeSession } from '../api/sessions'
import { Icon } from './ui/Icon'

interface Exercise {
  id: string
  name: string
  muscleGroup?: string
  defaultSets: number
  defaultReps: number
  defaultWeightKg: number
}

interface Props {
  sessionId: string
  exercises: Exercise[]
}

interface SetEntry {
  n: number
  reps: number
  weightKg: number
  completed: boolean
  idempotencyKey: string
}

export function GymLogger({ sessionId, exercises }: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [openEx, setOpenEx] = useState<string | null>(exercises[0]?.id ?? null)
  const [saving, setSaving] = useState(false)

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetEntry[]>>(() =>
    Object.fromEntries(
      exercises.map((ex) => [
        ex.id,
        Array.from({ length: ex.defaultSets }, (_, i) => ({
          n: i + 1,
          reps: ex.defaultReps,
          weightKg: ex.defaultWeightKg,
          completed: false,
          idempotencyKey: uuidv4(),
        })),
      ]),
    ),
  )

  const totalSets = Object.values(setsByExercise).reduce((a, b) => a + b.length, 0)
  const doneSets  = Object.values(setsByExercise).reduce((a, b) => a + b.filter((s) => s.completed).length, 0)
  const progress  = totalSets ? doneSets / totalSets : 0

  const bump = (exId: string, n: number, field: 'reps' | 'weightKg', delta: number) => {
    setSetsByExercise((prev) => ({
      ...prev,
      [exId]: prev[exId].map((s) =>
        s.n === n ? { ...s, [field]: Math.max(0, +(s[field] + delta).toFixed(2)) } : s,
      ),
    }))
  }

  const toggleSet = (exId: string, n: number) => {
    setSetsByExercise((prev) => ({
      ...prev,
      [exId]: prev[exId].map((s) => (s.n === n ? { ...s, completed: !s.completed } : s)),
    }))
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const payload = exercises.flatMap((ex) =>
        setsByExercise[ex.id].map((s) => ({
          exerciseId: ex.id,
          setNumber: s.n,
          reps: s.reps,
          weightKg: s.weightKg,
          completed: s.completed,
          idempotencyKey: s.idempotencyKey,
        })),
      )
      await upsertSets(sessionId, payload)
      await completeSession(sessionId)
      qc.invalidateQueries({ queryKey: ['session', sessionId] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      navigate('/')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Progress */}
      <div className="session-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress * 100}%`, background: 'var(--accent)' }} />
        </div>
        <div className="progress-meta">
          <span>{doneSets}/{totalSets} sets</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      </div>

      {/* Exercise list */}
      <div className="exlist">
        {exercises.map((ex, idx) => {
          const rows = setsByExercise[ex.id] ?? []
          const doneRows = rows.filter((r) => r.completed).length
          const allDone = rows.length > 0 && doneRows === rows.length
          const open = openEx === ex.id
          return (
            <div key={ex.id} className={`card ex${allDone ? ' complete' : ''}`}>
              <button className="ex-head" onClick={() => setOpenEx(open ? null : ex.id)}>
                <div
                  className="ex-num"
                  style={{
                    background: allDone ? 'var(--accent)' : 'transparent',
                    borderColor: 'var(--accent)',
                    color: allDone ? '#0b0b0b' : 'var(--ink)',
                  }}
                >
                  {allDone ? <Icon name="check" size={14} stroke={3} /> : idx + 1}
                </div>
                <div className="ex-name">
                  <div className="ex-title">{ex.name}</div>
                  <div className="ex-meta">
                    {ex.muscleGroup ? ex.muscleGroup + ' · ' : ''}
                    {ex.defaultSets}×{ex.defaultReps} · {ex.defaultWeightKg}kg
                  </div>
                </div>
                <div className="ex-prog">{doneRows}/{rows.length}</div>
              </button>

              {open && (
                <div className="ex-body">
                  <div className="set-head">
                    <span>SET</span><span>REPS</span><span>KG</span><span />
                  </div>
                  {rows.map((r) => (
                    <div key={r.n} className={`set-row${r.completed ? ' done' : ''}`}>
                      <span className="set-n">{r.n}</span>
                      <div className="stepper">
                        <button onClick={() => bump(ex.id, r.n, 'reps', -1)}><Icon name="minus" size={14} /></button>
                        <span className="mono">{r.reps}</span>
                        <button onClick={() => bump(ex.id, r.n, 'reps', +1)}><Icon name="plus" size={14} /></button>
                      </div>
                      <div className="stepper">
                        <button onClick={() => bump(ex.id, r.n, 'weightKg', -2.5)}><Icon name="minus" size={14} /></button>
                        <span className="mono">{r.weightKg}</span>
                        <button onClick={() => bump(ex.id, r.n, 'weightKg', +2.5)}><Icon name="plus" size={14} /></button>
                      </div>
                      <button
                        className={`check${r.completed ? ' on' : ''}`}
                        onClick={() => toggleSet(ex.id, r.n)}
                        style={{ borderColor: 'var(--accent)', background: r.completed ? 'var(--accent)' : 'transparent' }}
                      >
                        <Icon name="check" size={16} stroke={3} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Finish */}
      <div className="sticky-finish">
        <button className="btn primary full" onClick={handleFinish} disabled={saving}>
          <Icon name="check" size={18} stroke={3} /> {saving ? 'Saving…' : 'Finish session'}
        </button>
      </div>
    </>
  )
}
