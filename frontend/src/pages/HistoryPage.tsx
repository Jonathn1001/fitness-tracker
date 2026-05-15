import { useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import { SessionCard } from '../components/SessionCard'

export function HistoryPage() {
  const [filter, setFilter] = useState<'week' | 'month'>('week')

  const from = filter === 'week'
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data, isLoading } = useSessions({ from })

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">History</h1>

      <div className="flex gap-2">
        {(['week', 'month'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            Last {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : data?.data?.length === 0 ? (
        <p className="text-gray-500">No sessions yet. Start training!</p>
      ) : (
        <div className="space-y-3">
          {data?.data?.map((session: any) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
