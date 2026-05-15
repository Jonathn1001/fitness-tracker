import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  [roundType: string]: number | string
}

interface Props {
  data: DataPoint[]
  roundTypes: string[]
}

const COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8']

export function RoundQualityChart({ data, roundTypes }: Props) {
  if (!data.length) return <p className="text-gray-500 text-sm">No data yet</p>

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8 }}
          labelStyle={{ color: '#f9fafb' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
        {roundTypes.map((rt, i) => (
          <Line key={rt} type="monotone" dataKey={rt} stroke={COLORS[i % COLORS.length]}
            strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
