import { useQuery } from '@tanstack/react-query'
import { compareModels } from '../../api'
import Card from '../ui/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const MODEL_COLORS = {
  'XGBoost':           '#4f46e5',
  'Random Forest':     '#10b981',
  'Linear Regression': '#f59e0b',
}

const scoreLabel = (s) => {
  if (s >= 80) return 'Excellent'
  if (s >= 65) return 'Good'
  if (s >= 50) return 'Fair'
  if (s >= 35) return 'Poor'
  return 'Critical'
}

const scoreBg = (s) => {
  if (s >= 80) return 'bg-emerald-50 text-emerald-700'
  if (s >= 65) return 'bg-green-50 text-green-700'
  if (s >= 50) return 'bg-yellow-50 text-yellow-700'
  if (s >= 35) return 'bg-orange-50 text-orange-700'
  return 'bg-red-50 text-red-700'
}

export default function ModelComparison({ date }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['model-comparison', date],
    queryFn: () => compareModels(date).then(r => r.data),
    enabled: !!date,
  })

  if (isLoading) return (
    <Card className="p-6 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-48 mb-4" />
      <div className="h-40 bg-gray-100 rounded" />
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
        <h2 className="text-sm font-semibold text-gray-700">Model Comparison</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Same KPIs scored by three different ML models — for date: {data.date}
        </p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(data.models).map(([key, m]) => (
          <div key={key} className="rounded-xl border border-gray-100 p-4 text-center">
            <div
              className="w-3 h-3 rounded-full mx-auto mb-2"
              style={{ backgroundColor: MODEL_COLORS[m.label] }}
            />
            <p className="text-xs text-gray-500 font-medium mb-1">{m.label}</p>
            <p className="text-3xl font-bold text-gray-900">{m.score.toFixed(1)}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${scoreBg(m.score)}`}>
              {scoreLabel(m.score)}
            </span>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} barSize={48}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v) => [`${v.toFixed(1)} / 100`, 'Score']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={MODEL_COLORS[entry.name]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* KPIs used */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">KPIs fed into all models</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Gross Profit Margin', data.kpis.gross_profit_margin, '%'],
            ['Expense-to-Revenue',  data.kpis.expense_to_revenue_ratio, '%'],
            ['Customer Retention',  data.kpis.customer_retention_rate, '%'],
            ['Inventory Turnover',  data.kpis.inventory_turnover_rate, 'x'],
            ['Total Sales',         (data.kpis.total_sales / 1000).toFixed(0), 'K RWF'],
            ['Transactions',        data.kpis.num_transactions, ''],
          ].map(([label, val, unit]) => (
            <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-gray-800">{val}{unit}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
