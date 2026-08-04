import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyShiftStats, getTopItems } from '../api'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import { Sunrise, ShoppingBag, TrendingUp, Award, RefreshCw } from 'lucide-react'

const todayStr = () => new Date().toISOString().split('T')[0]
const fmt      = (n) => Number(n).toLocaleString('en-RW', { maximumFractionDigits: 0 })
const fmtDate  = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-RW', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <Card className="px-5 py-5 flex items-start gap-4">
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: accent ?? 'rgba(14,59,46,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} style={{ color: '#0E3B2E' }} />
      </div>
      <div className="min-w-0">
        <p style={{ fontSize: 12, color: '#7A9184', margin: 0, fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#0A2820', margin: '2px 0 0', lineHeight: 1.2 }}>
          {value}
        </p>
        {sub && (
          <p style={{ fontSize: 11, color: '#7A9184', margin: '3px 0 0' }}>{sub}</p>
        )}
      </div>
    </Card>
  )
}

export default function MyShiftPage() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayStr())

  const firstName = user?.first_name || user?.username || 'there'
  const isToday   = date === todayStr()

  // My completed orders for the selected date - filtered server-side to this user only
  const { data: txns = [], isLoading: txnsLoading } = useQuery({
    queryKey: ['my-shift-stats', date],
    queryFn:  () => getMyShiftStats(date).then(r => r.data.results ?? r.data),
  })

  // Top items across the whole business for the selected date - name + quantity only
  const { data: topItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['top-items', date],
    queryFn:  () => getTopItems(date).then(r => r.data),
  })

  // Derive stats from the transactions list - all arithmetic stays client-side
  const ordersServed = txns.length
  const totalValue   = txns.reduce((sum, t) => sum + parseFloat(t.total ?? 0), 0)
  const avgPerOrder  = ordersServed > 0 ? totalValue / ordersServed : 0

  const loading = txnsLoading || itemsLoading

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#0A2820' }}>
            My Shift
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7A9184' }}>
            {isToday ? `Good shift, ${firstName}! Here's how today is going.` : `Shift summary for ${fmtDate(date)}`}
          </p>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: '#fff', border: '1px solid #E2E9E5' }}>
          <Sunrise size={15} style={{ color: '#7A9184', flexShrink: 0 }} />
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={e => setDate(e.target.value)}
            className="text-sm bg-transparent focus:outline-none"
            style={{ color: '#0A2820' }}
          />
        </div>
      </div>

      {/* ── Stat cards ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-24 animate-pulse" style={{ background: '#E2E9E5' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={ShoppingBag}
            label="Orders Served"
            value={ordersServed}
            sub={ordersServed === 1 ? '1 order completed' : `${ordersServed} orders completed`}
          />
          <StatCard
            icon={TrendingUp}
            label="Total Value Served"
            value={`RWF ${fmt(totalValue)}`}
            sub="Your orders only"
          />
          <StatCard
            icon={Award}
            label="Avg per Order"
            value={ordersServed > 0 ? `RWF ${fmt(avgPerOrder)}` : '-'}
            sub={ordersServed > 0 ? 'Per completed order' : 'No orders yet'}
          />
        </div>
      )}

      {/* ── No orders yet nudge ── */}
      {!loading && ordersServed === 0 && (
        <Card className="px-6 py-8 text-center">
          <ShoppingBag size={28} style={{ color: '#B7C4BC', margin: '0 auto 8px' }} />
          <p className="font-medium" style={{ color: '#3D4F47' }}>No orders served yet</p>
          <p className="text-sm mt-1" style={{ color: '#7A9184' }}>
            {isToday
              ? 'Head to POS to start taking orders - they\'ll appear here once served.'
              : 'No completed orders recorded for this date.'}
          </p>
        </Card>
      )}

      {/* ── Today's top items ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#7A9184' }}>
            {isToday ? "Today's top items" : "Top items that day"}
          </h2>
          <RefreshCw size={12} style={{ color: '#B7C4BC' }} />
        </div>

        {loading ? (
          <Card className="divide-y" style={{ borderColor: '#E2E9E5' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3 animate-pulse">
                <div className="h-3 rounded flex-1" style={{ background: '#E2E9E5' }} />
                <div className="h-3 w-10 rounded" style={{ background: '#E2E9E5' }} />
              </div>
            ))}
          </Card>
        ) : topItems.length === 0 ? (
          <Card className="px-6 py-8 text-center">
            <p className="text-sm" style={{ color: '#7A9184' }}>
              No served orders yet - top items will appear once orders are completed.
            </p>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: '#E2E9E5' }}>
              {topItems.map((item, idx) => (
                <li key={item.name}
                  className="flex items-center gap-3 px-5 py-3">
                  {/* Rank number */}
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: idx === 0 ? '#0E3B2E' : 'rgba(14,59,46,0.08)',
                    color: idx === 0 ? '#fff' : '#7A9184',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {idx + 1}
                  </span>

                  {/* Item name */}
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: '#0A2820' }}>
                    {item.name}
                  </span>

                  {/* Quantity badge */}
                  <span style={{
                    fontSize: 11, fontWeight: 600, flexShrink: 0,
                    background: 'rgba(14,59,46,0.08)', color: '#0E3B2E',
                    padding: '2px 8px', borderRadius: 20,
                  }}>
                    ×{item.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

    </div>
  )
}
