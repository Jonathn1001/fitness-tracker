import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { upsertRounds, completeSession } from '../api/sessions'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

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

  const [entries, setEntries] = useState<RoundEntry[]>(() =>
    rounds.map((r) => ({
      roundTypeId: r.roundType.id,
      roundNumber: r.roundNumber,
      completed: false,
      qualityRating: 3,
      idempotencyKey: uuidv4(),
    }))
  )

  const update = (idx: number, field: string, value: any) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  const handleSave = async () => {
    await upsertRounds(sessionId, entries)
    await completeSession(sessionId)
    qc.invalidateQueries({ queryKey: ['session', sessionId] })
    qc.invalidateQueries({ queryKey: ['sessions'] })
    navigate('/')
  }

  return (
    <div className="space-y-3">
      {rounds.map((round, idx) => (
        <div key={round.id} className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-gray-400 text-xs">Round {round.roundNumber}</span>
              <p className="text-white font-semibold capitalize">{round.roundType.name}</p>
            </div>
            <button
              onClick={() => update(idx, 'completed', !entries[idx].completed)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                entries[idx].completed ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-400'
              }`}
            >
              {entries[idx].completed ? '✓ Done' : 'Mark Done'}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-gray-400 text-xs">Quality:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => update(idx, 'qualityRating', star)}
                className={`w-7 h-7 rounded-full text-xs font-bold ${
                  entries[idx].qualityRating >= star ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-500'
                }`}
              >
                {star}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleSave}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-4 text-sm">
        Complete Session
      </button>
    </div>
  )
}
