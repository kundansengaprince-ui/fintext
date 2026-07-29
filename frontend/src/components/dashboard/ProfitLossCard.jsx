import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Card from '../ui/Card'

const fmt = (n) => Number(n).toLocaleString('en-RW', { maximumFractionDigits: 0 })

export default function ProfitLossCard({ score }) {
  const sales    = parseFloat(score?.total_sales    ?? 0)
  const expenses = parseFloat(score?.total_expenses ?? 0)
  const net      = sales - expenses
  const margin   = sales > 0 ? ((net / sales) * 100).toFixed(1) : null
  const positive = net >= 0

  const monoStyle = {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: 17, fontWeight: 500,
  }

  return (
    <Card className="p-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#3D4F47', margin: 0 }}>Profit &amp; Loss</h2>
        <span style={{ fontSize: 12, color: '#B7C4BC' }}>For {score?.date}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: '#B7C4BC', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>Revenue</p>
          <p style={{ ...monoStyle, color: '#0A2820', margin: 0 }}>RWF {fmt(sales)}</p>
        </div>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: '#B7C4BC', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>Expenses</p>
          <p style={{ ...monoStyle, color: '#0A2820', margin: 0 }}>RWF {fmt(expenses)}</p>
        </div>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: '#B7C4BC', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>Net</p>
          <p style={{ ...monoStyle, color: positive ? '#0E3B2E' : '#9C4B3E', margin: 0 }}>
            {positive ? '+' : ''}RWF {fmt(net)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#E2E9E5', borderRadius: 2, overflow: 'hidden', marginBottom: 14 }}>
        {sales > 0 && (
          <div style={{
            height: '100%', borderRadius: 2,
            background: positive ? '#0E3B2E' : '#9C4B3E',
            width: `${Math.min(100, Math.abs(net / sales) * 100)}%`,
            transition: 'width 0.4s ease',
          }} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: positive ? '#0E3B2E' : '#9C4B3E' }}>
          {positive
            ? <TrendingUp size={14} strokeWidth={2} />
            : net === 0
            ? <Minus size={14} strokeWidth={2} />
            : <TrendingDown size={14} strokeWidth={2} />
          }
          {positive ? 'Profitable' : 'Operating at a loss'}
        </div>
        {margin !== null && (
          <span style={{ fontSize: 12, color: '#B7C4BC' }}>
            {positive ? '' : '-'}{Math.abs(margin)}% net margin
          </span>
        )}
      </div>
    </Card>
  )
}
