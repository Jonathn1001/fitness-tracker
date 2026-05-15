import { Link } from 'react-router-dom'

interface Props {
  session: {
    id: string
    date: string
    status: string
    templateDay?: { dayOfWeek: string; workoutType: string }
  }
}

export function SessionCard({ session }: Props) {
  const label = session.templateDay
    ? `${session.templateDay.dayOfWeek.toUpperCase()} — ${session.templateDay.workoutType}`
    : 'Ad-hoc session'

  return (
    <Link to={`/session/${session.id}`}
      className="block bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-gray-400 text-xs mt-1">{new Date(session.date).toLocaleDateString()}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          session.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
        }`}>
          {session.status === 'completed' ? 'Done' : 'In Progress'}
        </span>
      </div>
    </Link>
  )
}
