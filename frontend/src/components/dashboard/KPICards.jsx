import { TrendingUp, Receipt, Users, Package } from 'lucide-react'
import Card from '../ui/Card'

const fmt = (n) => n != null ? parseFloat(n).toFixed(1) : '—'

const kpis = (score) => [
  {
    label: 'Gross Profit Margin',
    value: score?.gross_profit_margin != null ? `${fmt(score.gross_profit_margin)}%` : '—',
    icon: TrendingUp,
    good: parseFloat(score?.gross_profit_margin) >= 45,
  },
  {
    label: 'Expense-to-Revenue',
    value: score?.expense_to_revenue_ratio != null ? `${fmt(score.expense_to_revenue_ratio)}%` : '—',
    icon: Receipt,
    good: parseFloat(score?.expense_to_revenue_ratio) <= 75,
  },
  {
    label: 'Customer Retention',
    value: score?.customer_retention_rate != null ? `${fmt(score.customer_retention_rate)}%` : '—',
    icon: Users,
    good: parseFloat(score?.customer_retention_rate) >= 40,
  },
  {
    label: 'Inventory Turnover',
    value: score?.inventory_turnover_rate != null ? `${fmt(score.inventory_turnover_rate)}x` : '—',
    icon: Package,
    good: parseFloat(score?.inventory_turnover_rate) >= 2.5,
  },
]

export default function KPICards({ score }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {kpis(score).map(({ label, value, icon: Icon, good }) => (
        <Card key={label} className="p-5">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'rgba(14,59,46,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={16} strokeWidth={1.5} style={{ color: '#0E3B2E' }} />
            </div>
            {/* Status dot */}
            <span style={{
              width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0,
              background: good ? '#0E3B2E' : '#9C4B3E',
              boxShadow: good
                ? '0 0 0 3px rgba(14,59,46,0.18), 0 0 8px rgba(14,59,46,0.5)'
                : '0 0 0 3px rgba(156,75,62,0.18), 0 0 8px rgba(156,75,62,0.4)',
            }} />
          </div>
          <p style={{
            fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
            fontSize: 24, fontWeight: 500, color: '#0A2820', margin: '0 0 4px',
          }}>
            {value}
          </p>
          <p style={{ fontSize: 12, color: '#7A9184', margin: 0 }}>{label}</p>
        </Card>
      ))}
    </div>
  )
}
