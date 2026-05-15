import { useSessions } from '../hooks/useSessions'
import { WeightProgressChart } from '../components/charts/WeightProgressChart'
import { RoundQualityChart } from '../components/charts/RoundQualityChart'
import { useQueries } from '@tanstack/react-query'
import { getSession } from '../api/sessions'

export function ProgressPage() {
  const { data: listData } = useSessions({
    from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'completed',
    limit: 14,
  })

  const sessionIds: string[] = listData?.data?.map((s: any) => s.id) ?? []

  const sessionQueries = useQueries({
    queries: sessionIds.map((id) => ({
      queryKey: ['session', id],
      queryFn: () => getSession(id),
      staleTime: 1000 * 60 * 10,
    })),
  })

  const completedSessions = sessionQueries
    .filter((q) => q.data)
    .map((q) => q.data)

  const gymSessions = completedSessions.filter((s: any) => s.templateDay?.workoutType === 'gym')
  const exerciseNames = [...new Set(
    gymSessions.flatMap((s: any) => s.sessionSets.map((ss: any) => ss.exercise.name))
  )]
  const weightData = gymSessions.map((s: any) => {
    const point: { date: string; [key: string]: any } = { date: new Date(s.date).toLocaleDateString() }
    for (const name of exerciseNames) {
      const sets = s.sessionSets.filter((ss: any) => ss.exercise.name === name)
      if (sets.length) point[name] = Math.max(...sets.map((ss: any) => ss.weightKg))
    }
    return point
  })

  const kbSessions = completedSessions.filter((s: any) => s.templateDay?.workoutType === 'kickboxing')
  const roundTypeNames = [...new Set(
    kbSessions.flatMap((s: any) => s.sessionRounds.map((sr: any) => sr.roundType.name))
  )]
  const qualityData = kbSessions.map((s: any) => {
    const point: { date: string; [key: string]: any } = { date: new Date(s.date).toLocaleDateString() }
    for (const name of roundTypeNames) {
      const rounds = s.sessionRounds.filter((sr: any) => sr.roundType.name === name && sr.qualityRating)
      if (rounds.length) {
        point[name] = rounds.reduce((sum: number, r: any) => sum + r.qualityRating, 0) / rounds.length
      }
    }
    return point
  })

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-white">Progress</h1>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Barbell Weight (last 14 days)</h2>
        <WeightProgressChart data={weightData} exercises={exerciseNames as string[]} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Kickboxing Round Quality</h2>
        <RoundQualityChart data={qualityData} roundTypes={roundTypeNames as string[]} />
      </div>
    </div>
  )
}
