import { useQuery } from '@tanstack/react-query'
import { compareModels } from '../../api'
import Card from '../ui/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// All three models map to forest-family — differentiated by opacity/shade only
const MODEL_COLORS = {
  'XGBoost':           '#0E3B2E',
  'Random Forest':     '#164C3B',
  'Linear Regression': '#7A9184',
}

const scoreLabel = (s) => {
  if (s >= 80) return 'Excellent'
  if (s >= 65) return 'Good'
  if (s >= 50) return 'Fair'
  if (s >= 35) return 'Poor'
  return 'Critical'
}

export default function ModelComparison({ date }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['model-comparison', date],
    queryFn: () => compareModels(date).then(r => r.data),
    enabled: !!date,
  })

  if (isLoading) return (
    <Card className="p-6 animate-pulse">
      <div className="h-4 rounded w-48 mb-4" style={{ background: '#E2E9E5' }} />
      <div className="h-40 rounded" style={{ background: '#E2E9E5' }} />
    </Card>
  )

  if (isError || !data) return null

  const chartData = Object.entries(data.models).map(([, m]) => ({
    name: m.label,
    score: m.score,
  }))

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold" style={{ color: '#3D4F47' }}>Model Comparison</h2>
        <p className="text-xs mt-0.5" style={{ color: '#B7C4BC' }}>
          Same KPIs scored by three different ML models — for date: {data.date}
        </p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(data.models).map(([key, m]) => (
          <div key={key} className="rounded-xl p-4 text-center" style={{ border: '1px solid #E2E9E5' }}>
            <div className="w-3 h-3 rounded-full mx-auto mb-2"
              style={{ backgroundColor: MODEL_COLORS[m.label] }} />
            <p className="text-xs font-medium mb-1" style={{ color: '#7A9184' }}>{m.label}</p>
            <p className="text-3xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#0A2820' }}>
              {m.score.toFixed(1)}
            </p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
              style={{ background: 'rgba(14,59,46,0.08)', color: '#0E3B2E' }}>
              {scoreLabel(m.score)}
            </span>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} barSize={48}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E9E5" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#7A9184' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#B7C4BC' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v) => [`${v.toFixed(1)} / 100`, 'Score']}
            contentStyle={{ borderRadius: 8, border: '1px solid #E2E9E5', fontSize: 12 }}
          />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={MODEL_COLORS[entry.name]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* KPIs used */}
      <div className="mt-5 pt-4" style={{ borderTop: '1px solid #E2E9E5' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#7A9184' }}>
          KPIs fed into all models
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Gross Profit Margin', data.kpis.gross_profit_margin, '%'],
            ['Expense-to-Revenue',  data.kpis.expense_to_revenue_ratio, '%'],
            ['Customer Retention',  data.kpis.customer_retention_rate, '%'],
            ['Inventory Turnover',  data.kpis.inventory_turnover_rate, 'x'],
            ['Total Sales',         (data.kpis.total_sales / 1000).toFixed(0), 'K RWF'],
            ['Transactions',        data.kpis.num_transactions, ''],
          ].map(([label, val, unit]) => (
            <div key={label} className="rounded-lg px-3 py-2" style={{ background: '#FAFBF9', border: '1px solid #E2E9E5' }}>
              <p className="text-xs" style={{ color: '#B7C4BC' }}>{label}</p>
              <p className="text-sm font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#0A2820' }}>
                {val}{unit}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
