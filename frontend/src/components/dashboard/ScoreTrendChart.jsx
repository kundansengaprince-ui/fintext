import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const score = payload[0].value
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-indigo-600 font-bold mt-1">Score: {score?.toFixed(1)}</p>
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
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No history data yet — compute scores to populate this chart.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={65} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Good', position: 'right', fontSize: 10, fill: '#22c55e' }} />
        <ReferenceLine y={35} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Poor', position: 'right', fontSize: 10, fill: '#f97316' }} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#6366f1' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
