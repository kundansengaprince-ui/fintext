import { TrendingUp, Receipt, Users, Package } from 'lucide-react'
import Card from '../ui/Card'

const fmt = (n, prefix = '') =>
  n != null ? `${prefix}${parseFloat(n).toLocaleString('en-RW', { maximumFractionDigits: 1 })}` : '—'

const kpis = (score) => [
  {
    label: 'Gross Profit Margin',
    value: fmt(score?.gross_profit_margin, '') + (score?.gross_profit_margin != null ? '%' : ''),
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    good: parseFloat(score?.gross_profit_margin) >= 45,
  },
  {
    label: 'Expense-to-Revenue',
    value: fmt(score?.expense_to_revenue_ratio, '') + (score?.expense_to_revenue_ratio != null ? '%' : ''),
    icon: Receipt,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    good: parseFloat(score?.expense_to_revenue_ratio) <= 75,
  },
  {
    label: 'Customer Retention',
    value: fmt(score?.customer_retention_rate, '') + (score?.customer_retention_rate != null ? '%' : ''),
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    good: parseFloat(score?.customer_retention_rate) >= 40,
  },
  {
    label: 'Inventory Turnover',
    value: fmt(score?.inventory_turnover_rate) + (score?.inventory_turnover_rate != null ? 'x' : ''),
    icon: Package,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    good: parseFloat(score?.inventory_turnover_rate) >= 2.5,
  },
]

export default function KPICards({ score }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {kpis(score).map(({ label, value, icon, color, bg, good }) => {
        const Icon = icon
        return (
        <Card key={label} className="p-4">
          <div className="flex items-start justify-between">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <span className={`w-2 h-2 rounded-full mt-1 ${good ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
        </Card>
        )
      })}
    </div>
  )
}
