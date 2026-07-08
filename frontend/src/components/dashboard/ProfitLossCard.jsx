import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Card from '../ui/Card'

const fmt = (n) => Number(n).toLocaleString('en-RW', { maximumFractionDigits: 0 })

export default function ProfitLossCard({ score }) {
  const sales    = parseFloat(score?.total_sales    ?? 0)
  const expenses = parseFloat(score?.total_expenses ?? 0)
  const net      = sales - expenses
  const margin   = sales > 0 ? ((net / sales) * 100).toFixed(1) : null
  const positive = net >= 0

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Profit &amp; Loss</h2>
        <span className="text-xs text-gray-400">For {score?.date}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Revenue</p>
          <p className="text-lg font-bold text-gray-900">RWF {fmt(sales)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Expenses</p>
          <p className="text-lg font-bold text-gray-900">RWF {fmt(expenses)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Net</p>
          <p className={`text-lg font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
            {positive ? '+' : ''}RWF {fmt(net)}
          </p>
        </div>
      </div>

      {/* Visual bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        {sales > 0 && (
          <div
            className={`h-full rounded-full transition-all ${positive ? 'bg-emerald-400' : 'bg-red-400'}`}
            style={{ width: `${Math.min(100, Math.abs(net / sales) * 100)}%` }}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
          {positive
            ? <TrendingUp size={15} />
            : net === 0
            ? <Minus size={15} />
            : <TrendingDown size={15} />
          }
          {positive ? 'Profitable' : 'Operating at a loss'}
        </div>
        {margin !== null && (
          <span className="text-xs text-gray-400">
            {positive ? '' : '-'}{Math.abs(margin)}% net margin
          </span>
        )}
      </div>
    </Card>
  )
}
