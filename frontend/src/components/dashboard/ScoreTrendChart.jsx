import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const score = payload[0].value
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E9E5', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ fontWeight: 600, color: '#3D4F47', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, color: '#0E3B2E', margin: 0 }}>
        {score?.toFixed(1)} / 100
      </p>
    </div>
  )
}

export default function ScoreTrendChart({ data = [] }) {
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-RW', { month: 'short', day: 'numeric' }),
    score: parseFloat(d.score),
  }))

  if (!chartData.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#B7C4BC' }}>
        No history data yet — compute scores to populate this chart.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E9E5" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B7C4BC' }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#B7C4BC' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={65} stroke="#0E3B2E" strokeDasharray="4 4" strokeOpacity={0.4}
          label={{ value: 'Good', position: 'right', fontSize: 10, fill: '#0E3B2E' }} />
        <ReferenceLine y={35} stroke="#C9A15C" strokeDasharray="4 4" strokeOpacity={0.5}
          label={{ value: 'Poor', position: 'right', fontSize: 10, fill: '#C9A15C' }} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#0E3B2E"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#0E3B2E', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#0E3B2E' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
