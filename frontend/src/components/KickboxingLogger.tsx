import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { upsertRounds, completeSession } from '../api/sessions'
import { Icon } from './ui/Icon'

interface Round {
  id: string
  roundNumber: number
  roundType: { id: string; name: string }
}

interface Props {
  sessionId: string
  rounds: Round[]
}

interface RoundEntry {
  roundTypeId: string
  roundNumber: number
  completed: boolean
  qualityRating: number
  idempotencyKey: string
}

export function KickboxingLogger({ sessionId, rounds }: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const [entries, setEntries] = useState<RoundEntry[]>(() =>
    rounds.map((r) => ({
      roundTypeId: r.roundType.id,
      roundNumber: r.roundNumber,
      completed: false,
      qualityRating: 3,
      idempotencyKey: uuidv4(),
    })),
  )

  const doneCount = entries.filter((e) => e.completed).length
  const progress = entries.length ? doneCount / entries.length : 0

  const setField = (i: number, field: keyof RoundEntry, value: number | boolean) => {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)))
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      await upsertRounds(sessionId, entries)
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
          <div className="progress-fill" style={{ width: `${progress * 100}%`, background: 'var(--accent-2)' }} />
        </div>
        <div className="progress-meta">
          <span>{doneCount}/{entries.length} rounds</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      </div>

      {/* Round list */}
      <div className="rounds">
        {rounds.map((round, idx) => {
          const entry = entries[idx]
          return (
            <div key={round.id} className={`card round${entry.completed ? ' complete' : ''}`}>
              <div className="round-head">
                <div
                  className="round-num"
                  style={{
                    background: entry.completed ? 'var(--accent-2)' : 'transparent',
                    borderColor: 'var(--accent-2)',
                    color: entry.completed ? '#0b0b0b' : 'var(--ink)',
                  }}
                >
                  {entry.completed ? <Icon name="check" size={14} stroke={3} /> : round.roundNumber}
                </div>
                <div className="round-name">
                  <div className="round-title">
                    {round.roundType.name[0].toUpperCase() + round.roundType.name.slice(1)}
                  </div>
                  <div className="round-meta">Quality {entry.qualityRating} / 5</div>
                </div>
                <button
                  className={`check${entry.completed ? ' on' : ''}`}
                  onClick={() => setField(idx, 'completed', !entry.completed)}
                  style={{ borderColor: 'var(--accent-2)', background: entry.completed ? 'var(--accent-2)' : 'transparent' }}
                >
                  <Icon name="check" size={16} stroke={3} />
                </button>
              </div>
              <div className="rate">
                <span className="rate-lbl">Quality</span>
                <div className="dots">
                  {[1, 2, 3, 4, 5].map((q) => (
                    <button
                      key={q}
                      className={`dot${entry.qualityRating >= q ? ' on' : ''}`}
                      onClick={() => setField(idx, 'qualityRating', q)}
                      style={{ background: entry.qualityRating >= q ? 'var(--accent-2)' : 'transparent', borderColor: 'var(--accent-2)' }}
                    />
                  ))}
                </div>
              </div>
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
