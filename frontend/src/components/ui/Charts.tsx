interface LineChartProps {
  data: number[]
  color: string
  height?: number
  fill?: boolean
  axis?: boolean
}

export function LineChart({ data, color, height = 200, fill = true, axis = true }: LineChartProps) {
  if (!data.length) {
    return <p className="dim" style={{ fontSize: 13 }}>No data yet</p>
  }
  const series = data.length === 1 ? [data[0], data[0]] : data

  const w = 600, h = height
  const pad = { l: 36, r: 12, t: 12, b: 24 }
  const min = Math.min(...series) * 0.95
  const max = Math.max(...series) * 1.02
  const range = max - min || 1
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const pts = series.map((v, i) => [
    pad.l + (i / (series.length - 1)) * innerW,
    pad.t + (1 - (v - min) / range) * innerH,
  ])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${d} L${pts[pts.length - 1][0]} ${pad.t + innerH} L${pts[0][0]} ${pad.t + innerH} Z`
  const gridY = [0, 0.25, 0.5, 0.75, 1]
  const gid = `lg-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {axis &&
        gridY.map((t) => (
          <g key={t}>
            <line
              x1={pad.l} x2={w - pad.r}
              y1={pad.t + t * innerH} y2={pad.t + t * innerH}
              stroke="var(--line)" strokeDasharray="2 4"
            />
            <text
              x={pad.l - 6} y={pad.t + t * innerH + 3} textAnchor="end"
              fontSize="9" fill="var(--muted)" fontFamily="JetBrains Mono"
            >
              {(max - t * range).toFixed(1)}
            </text>
          </g>
        ))}
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle
          key={i} cx={p[0]} cy={p[1]}
          r={i === pts.length - 1 ? 4 : 2.5}
          fill={color}
          stroke="var(--surface)"
          strokeWidth={i === pts.length - 1 ? 2 : 0}
        />
      ))}
    </svg>
  )
}

interface BarChartProps {
  data: number[]
  color: string
  height?: number
}

export function BarChart({ data, color, height = 160 }: BarChartProps) {
  if (!data.length) return <p className="dim" style={{ fontSize: 13 }}>No data yet</p>
  const w = 600, h = height
  const pad = { l: 36, r: 12, t: 12, b: 24 }
  const max = Math.max(...data) * 1.05 || 1
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const bw = innerW / data.length - 8

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" preserveAspectRatio="none">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line
            x1={pad.l} x2={w - pad.r}
            y1={pad.t + t * innerH} y2={pad.t + t * innerH}
            stroke="var(--line)" strokeDasharray="2 4"
          />
          <text
            x={pad.l - 6} y={pad.t + t * innerH + 3} textAnchor="end"
            fontSize="9" fill="var(--muted)" fontFamily="JetBrains Mono"
          >
            {Math.round((max - t * max) / 1000)}k
          </text>
        </g>
      ))}
      {data.map((v, i) => {
        const x = pad.l + i * (innerW / data.length) + 4
        const bh = (v / max) * innerH
        const y = pad.t + innerH - bh
        return (
          <rect
            key={i} x={x} y={y} width={bw} height={bh} rx="4"
            fill={color} opacity={i === data.length - 1 ? 1 : 0.55}
          />
        )
      })}
    </svg>
  )
}

interface DonutChartProps {
  value: number
  max?: number
  color: string
  size?: number
}

export function DonutChart({ value, max = 100, color, size = 140 }: DonutChartProps) {
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth="10" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
        strokeDasharray={`${(c * value) / max} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2 + 6} textAnchor="middle"
        fontSize="28" fontWeight="700" fill="var(--ink)" fontFamily="Plus Jakarta Sans"
      >
        {value}
      </text>
      <text
        x={size / 2} y={size / 2 + 24} textAnchor="middle"
        fontSize="10" fill="var(--muted)" letterSpacing="0.05em"
      >
        / {max}
      </text>
    </svg>
  )
}
