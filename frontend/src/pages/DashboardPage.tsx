import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { createSession } from '../api/sessions'

const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function DashboardPage() {
  const { data: plan, isLoading } = useWeeklyPlan()
  const navigate = useNavigate()

  const todayDow = DAY_ORDER[new Date().getDay()]
  const todayDay = plan?.days?.find((d: any) => d.dayOfWeek === todayDow)

  const handleStartSession = async () => {
    const session = await createSession({
      templateDayId: todayDay?.id,
      date: new Date().toISOString().split('T')[0],
      idempotencyKey: uuidv4(),
    })
    navigate(`/session/${session.id}`)
  }

  if (isLoading) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Today</h1>

      {todayDay ? (
        <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
          <p className="text-gray-400 text-sm uppercase tracking-wide">{todayDow}</p>
          <p className="text-white text-lg font-semibold capitalize">{todayDay.workoutType} Session</p>
          {todayDay.workoutType === 'gym' && (
            <p className="text-gray-400 text-sm">
              {todayDay.templateExercises?.length ?? 0} exercises
            </p>
          )}
          {todayDay.workoutType === 'kickboxing' && (
            <p className="text-gray-400 text-sm">10 rounds</p>
          )}
          <button
            onClick={handleStartSession}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 text-sm mt-2"
          >
            Start Session
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-5 text-center text-gray-400">
          Rest day — no session today
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">This Week</h2>
        <div className="grid grid-cols-7 gap-1">
          {plan?.days?.map((day: any) => (
            <div key={day.id}
              className={`rounded-lg p-2 text-center text-xs ${
                day.dayOfWeek === todayDow ? 'bg-blue-700 text-white' :
                day.workoutType === 'gym' ? 'bg-gray-700 text-gray-300' :
                'bg-purple-900 text-purple-300'
              }`}
            >
              <p className="font-semibold">{day.dayOfWeek.slice(0, 2).toUpperCase()}</p>
              <p className="text-[10px] mt-0.5 opacity-70">
                {day.workoutType === 'gym' ? 'Gym' : 'KB'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
