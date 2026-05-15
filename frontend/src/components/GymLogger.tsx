import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { upsertSets, completeSession } from '../api/sessions'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

interface Exercise {
  id: string
  name: string
  defaultSets: number
  defaultReps: number
  defaultWeightKg: number
}

interface Props {
  sessionId: string
  exercises: Exercise[]
}

interface SetEntry {
  setNumber: number
  reps: number
  weightKg: number
  completed: boolean
  idempotencyKey: string
}

export function GymLogger({ sessionId, exercises }: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetEntry[]>>(
    () => Object.fromEntries(
      exercises.map((ex) => [
        ex.id,
        Array.from({ length: ex.defaultSets }, (_, i) => ({
          setNumber: i + 1,
          reps: ex.defaultReps,
          weightKg: ex.defaultWeightKg,
          completed: false,
          idempotencyKey: uuidv4(),
        })),
      ])
    )
  )

  const updateSet = (exId: string, idx: number, field: string, value: any) => {
    setSetsByExercise((prev) => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }))
  }

  const handleSave = async () => {
    const allSets = exercises.flatMap((ex) =>
      setsByExercise[ex.id].map((s) => ({ exerciseId: ex.id, ...s }))
    )
    await upsertSets(sessionId, allSets)
    await completeSession(sessionId)
    qc.invalidateQueries({ queryKey: ['session', sessionId] })
    qc.invalidateQueries({ queryKey: ['sessions'] })
    navigate('/')
  }

  return (
    <div className="space-y-6">
      {exercises.map((ex) => (
        <div key={ex.id} className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">{ex.name}</h3>
          <div className="space-y-2">
            {setsByExercise[ex.id]?.map((set, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-6">S{set.setNumber}</span>
                <input type="number" value={set.reps} min={0}
                  onChange={(e) => updateSet(ex.id, idx, 'reps', Number(e.target.value))}
                  className="w-16 bg-gray-700 text-white text-sm rounded px-2 py-1 text-center"
                  placeholder="Reps"
                />
                <span className="text-gray-500 text-xs">×</span>
                <input type="number" value={set.weightKg} min={0} step={0.5}
                  onChange={(e) => updateSet(ex.id, idx, 'weightKg', Number(e.target.value))}
                  className="w-20 bg-gray-700 text-white text-sm rounded px-2 py-1 text-center"
                  placeholder="kg"
                />
                <button
                  onClick={() => updateSet(ex.id, idx, 'completed', !set.completed)}
                  className={`ml-auto text-xs px-3 py-1 rounded-full ${
                    set.completed ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {set.completed ? '✓' : 'Done'}
                </button>
              </div>
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
