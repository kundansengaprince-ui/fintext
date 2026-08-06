import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTeamShifts } from '../api'
import Card from '../components/ui/Card'
import { Users2, CalendarDays, TrendingUp, ShoppingBag, Award } from 'lucide-react'

const todayStr = () => new Date().toISOString().split('T')[0]
const fmt      = (n) => Number(n).toLocaleString('en-RW', { maximumFractionDigits: 0 })
const fmtDate  = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-RW', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

export default function TeamShiftsPage() {
  const [date, setDate] = useState(todayStr())
  const isToday = date === todayStr()

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['team-shifts', date],
    queryFn:  () => getTeamShifts(date).then(r => r.data),
  })

  // Derive team-level totals client-side
  const totalOrders = rows.reduce((s, r) => s + r.orders_served, 0)
  const totalValue  = rows.reduce((s, r) => s + parseFloat(r.total_value ?? 0), 0)

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#0A2820' }}>
            Team Shifts
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7A9184' }}>
            {isToday
              ? "Today's floor staff performance — live as orders are served."
              : `Shift summary for ${fmtDate(date)}`}
          </p>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: '#fff', border: '1px solid #E2E9E5' }}>
          <CalendarDays size={15} style={{ color: '#7A9184', flexShrink: 0 }} />
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

      {/* ── Summary cards ── */}
      {!isLoading && rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="px-5 py-5 flex items-start gap-4">
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'rgba(14,59,46,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users2 size={18} style={{ color: '#0E3B2E' }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 12, color: '#7A9184', margin: 0, fontWeight: 500 }}>Waiters Active</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#0A2820', margin: '2px 0 0', lineHeight: 1.2 }}>
                {rows.length}
              </p>
              <p style={{ fontSize: 11, color: '#7A9184', margin: '3px 0 0' }}>with at least 1 order</p>
            </div>
          </Card>

          <Card className="px-5 py-5 flex items-start gap-4">
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'rgba(14,59,46,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingBag size={18} style={{ color: '#0E3B2E' }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 12, color: '#7A9184', margin: 0, fontWeight: 500 }}>Total Orders</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#0A2820', margin: '2px 0 0', lineHeight: 1.2 }}>
                {totalOrders}
              </p>
              <p style={{ fontSize: 11, color: '#7A9184', margin: '3px 0 0' }}>across all waiters</p>
            </div>
          </Card>

          <Card className="px-5 py-5 flex items-start gap-4">
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'rgba(14,59,46,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={18} style={{ color: '#0E3B2E' }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 12, color: '#7A9184', margin: 0, fontWeight: 500 }}>Total Value</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#0A2820', margin: '2px 0 0', lineHeight: 1.2 }}>
                RWF {fmt(totalValue)}
              </p>
              <p style={{ fontSize: 11, color: '#7A9184', margin: '3px 0 0' }}>all floor staff combined</p>
            </div>
          </Card>
        </div>
      )}

      {/* ── Leaderboard table ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#7A9184' }}>
            {isToday ? "Today's leaderboard" : 'Shift leaderboard'}
          </h2>
          <Award size={12} style={{ color: '#B7C4BC' }} />
        </div>

        {isLoading ? (
          <Card className="divide-y" style={{ borderColor: '#E2E9E5' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="h-3 w-5 rounded" style={{ background: '#E2E9E5', flexShrink: 0 }} />
                <div className="h-3 rounded flex-1" style={{ background: '#E2E9E5' }} />
                <div className="h-3 w-16 rounded" style={{ background: '#E2E9E5' }} />
                <div className="h-3 w-20 rounded" style={{ background: '#E2E9E5' }} />
                <div className="h-3 w-16 rounded" style={{ background: '#E2E9E5' }} />
              </div>
            ))}
          </Card>
        ) : rows.length === 0 ? (
          <Card className="px-6 py-10 text-center">
            <Users2 size={28} style={{ color: '#B7C4BC', margin: '0 auto 8px' }} />
            <p className="font-medium" style={{ color: '#3D4F47' }}>No completed orders yet</p>
            <p className="text-sm mt-1" style={{ color: '#7A9184' }}>
              {isToday
                ? 'Floor staff orders will appear here once they are served.'
                : 'No completed floor staff orders were recorded for this date.'}
            </p>
          </Card>
        ) : (
          <Card>
            {/* Table header */}
            <div className="px-5 py-2.5 hidden sm:grid"
              style={{
                gridTemplateColumns: '2rem 1fr 7rem 9rem 7rem',
                borderBottom: '1px solid #E2E9E5',
              }}>
              {['#', 'Waiter', 'Orders', 'Total Value', 'Avg / Order'].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#7A9184', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <ul className="divide-y" style={{ borderColor: '#E2E9E5' }}>
              {rows.map((row, idx) => {
                const avg = row.orders_served > 0
                  ? parseFloat(row.total_value) / row.orders_served
                  : 0
                const isTop = idx === 0

                return (
                  <li key={row.waiter_name}
                    className="px-5 py-3.5 flex sm:grid items-center gap-3 sm:gap-0 flex-wrap"
                    style={{
                      gridTemplateColumns: '2rem 1fr 7rem 9rem 7rem',
                      background: isTop ? 'rgba(14,59,46,0.03)' : 'transparent',
                    }}>

                    {/* Rank */}
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: isTop ? '#0E3B2E' : 'rgba(14,59,46,0.08)',
                      color: isTop ? '#fff' : '#7A9184',
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {idx + 1}
                    </span>

                    {/* Name */}
                    <span className="flex-1 text-sm font-semibold truncate sm:flex-none"
                      style={{ color: '#0A2820' }}>
                      {row.waiter_name}
                      {isTop && (
                        <span style={{
                          marginLeft: 6, fontSize: 10, fontWeight: 600,
                          background: 'rgba(14,59,46,0.10)', color: '#0E3B2E',
                          padding: '1px 7px', borderRadius: 20,
                          verticalAlign: 'middle',
                        }}>
                          Top
                        </span>
                      )}
                    </span>

                    {/* Orders */}
                    <span className="text-sm" style={{ color: '#3D4F47', fontVariantNumeric: 'tabular-nums' }}>
                      {row.orders_served}
                      <span style={{ fontSize: 11, color: '#7A9184', marginLeft: 3 }}>orders</span>
                    </span>

                    {/* Total value */}
                    <span className="text-sm font-semibold" style={{ color: '#0A2820', fontVariantNumeric: 'tabular-nums' }}>
                      RWF {fmt(row.total_value)}
                    </span>

                    {/* Avg */}
                    <span className="text-sm" style={{ color: '#7A9184', fontVariantNumeric: 'tabular-nums' }}>
                      {row.orders_served > 0 ? `RWF ${fmt(avg)}` : '—'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>

    </div>
  )
}
