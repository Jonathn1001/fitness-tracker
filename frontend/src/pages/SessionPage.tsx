import { useParams, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { GymLogger } from '../components/GymLogger'
import { KickboxingLogger } from '../components/KickboxingLogger'
import { deleteSession } from '../api/sessions'

export function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading } = useSession(id!)
  const navigate = useNavigate()

  const handleDelete = async () => {
    if (!confirm('Discard this session?')) return
    await deleteSession(id!)
    navigate('/')
  }

  if (isLoading) return <div className="p-6 text-gray-400">Loading session...</div>
  if (!session) return <div className="p-6 text-red-400">Session not found</div>

  const workoutType = session.templateDay?.workoutType ?? 'gym'

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white capitalize">{workoutType} Session</h1>
          <p className="text-gray-400 text-sm">{new Date(session.date).toLocaleDateString()}</p>
        </div>
        {session.status === 'in_progress' && (
          <button onClick={handleDelete} className="text-red-400 text-sm hover:text-red-300">
            Discard
          </button>
        )}
      </div>

      {session.status === 'completed' ? (
        <div className="bg-green-900 rounded-xl p-4 text-green-300 text-center">
          Session completed!
        </div>
      ) : workoutType === 'gym' ? (
        <GymLogger
          sessionId={session.id}
          exercises={session.templateDay?.templateExercises?.map((te: any) => ({
            id: te.exercise.id,
            name: te.exercise.name,
            defaultSets: te.defaultSets,
            defaultReps: te.defaultReps,
            defaultWeightKg: te.defaultWeightKg,
          })) ?? []}
        />
      ) : (
        <KickboxingLogger
          sessionId={session.id}
          rounds={session.templateDay?.templateRounds?.map((tr: any) => ({
            id: tr.id,
            roundNumber: tr.roundNumber,
            roundType: tr.roundType,
          })) ?? []}
        />
      )}
    </div>
  )
}
