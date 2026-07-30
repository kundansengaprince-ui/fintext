import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, Cell,
} from 'recharts'
import { getFinancialAnalytics, getBudgetSuggestions, saveBudget } from '../api'
import Card from '../components/ui/Card'
import toast from 'react-hot-toast'
import { TrendingUp, TrendingDown, DollarSign, Percent, Droplets, AlertTriangle, Calendar, Sparkles, Save } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────
const today   = () => new Date().toISOString().split('T')[0]
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0]
const fmtRWF  = (n) => `RWF ${Number(n ?? 0).toLocaleString('en-RW', { maximumFractionDigits: 0 })}`
const fmtPct  = (n) => n != null ? `${Number(n).toFixed(1)}%` : '—'

const FOREST = '#0E3B2E'
const GOLD   = '#C9A15C'
const RED    = '#9C4B3E'
const SAGE   = '#7A9184'

// ── Tooltip shared style ──────────────────────────────────────────────────────
const TooltipBox = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E9E5', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ fontWeight: 600, color: '#3D4F47', margin: '0 0 6px' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon: Icon, sub, warn }) {
  return (
    <Card className="p-5">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(14,59,46,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} strokeWidth={1.5} style={{ color: warn ? GOLD : FOREST }} />
        </div>
        {warn && <AlertTriangle size={14} style={{ color: GOLD, marginTop: 4 }} />}
      </div>
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 500, color: '#0A2820', margin: '0 0 3px' }}>{value}</p>
      <p style={{ fontSize: 12, color: SAGE, margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: warn ? GOLD : SAGE, margin: '4px 0 0' }}>{sub}</p>}
    </Card>
  )
}

// ── Biggest drag insight ──────────────────────────────────────────────────────
function BiggestDragInsight({ data }) {
  if (!data) return null
  const { kpis, expense_by_category, monthly_trend } = data

  // Find fastest-growing expense category (highest positive mom_pct)
  const draggingCat = [...(expense_by_category || [])]
    .filter(c => c.mom_pct != null && c.mom_pct > 0)
    .sort((a, b) => b.mom_pct - a.mom_pct)[0]

  // Check if margin is declining (last 2 months of trend)
  const trend = monthly_trend || []
  const marginDeclining = trend.length >= 2 &&
    trend[trend.length - 1].net_margin < trend[trend.length - 2].net_margin

  // Check cash balance direction
  const cashLow = kpis.runway_months != null && kpis.runway_months < 3

  let text, color
  if (draggingCat && draggingCat.mom_pct > 20) {
    text = `⚠ Biggest drag: ${draggingCat.category} expenses grew ${draggingCat.mom_pct}% month-over-month — the fastest-growing cost in your business right now.`
    color = GOLD
  } else if (cashLow) {
    text = `⚠ Cash runway is only ${kpis.runway_months} months at current burn rate — prioritise reducing expenses or increasing revenue immediately.`
    color = RED
  } else if (marginDeclining) {
    text = `Net margin declined from ${fmtPct(trend[trend.length - 2].net_margin)} to ${fmtPct(trend[trend.length - 1].net_margin)} last month — monitor expense growth closely.`
    color = GOLD
  } else if (kpis.net_profit < 0) {
    text = `Your business is currently operating at a loss of ${fmtRWF(Math.abs(kpis.net_profit))} in this period. Review your largest expense categories below.`
    color = RED
  } else {
    text = `✓ Business is profitable with a ${fmtPct(kpis.margin_pct)} net margin. ${draggingCat ? `Watch ${draggingCat.category} — it's your largest expense category.` : ''}`
    color = FOREST
  }

  return (
    <p style={{ fontSize: 13, padding: '12px 16px', borderRadius: 12, borderLeft: `3px solid ${color}`, background: color === FOREST ? 'rgba(14,59,46,0.05)' : color === GOLD ? '#FEF9EC' : '#FDF2F0', color: color === FOREST ? FOREST : '#3D2010', margin: 0 }}>
      {text}
    </p>
  )
}

// ── P&L table ─────────────────────────────────────────────────────────────────
function PLTable({ kpis, expense_by_category }) {
  const revenue  = kpis?.revenue  ?? 0
  const expenses = kpis?.expenses ?? 0
  const profit   = kpis?.net_profit ?? 0

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #E2E9E5' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', color: SAGE, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line Item</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', color: SAGE, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (RWF)</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', color: SAGE, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>% of Revenue</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: 'rgba(14,59,46,0.03)' }}>
            <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0A2820' }}>Total Revenue</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: FOREST }}>{fmtRWF(revenue)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', color: SAGE }}>100%</td>
          </tr>
          {(expense_by_category || []).map(cat => (
            <tr key={cat.category} style={{ borderTop: '1px solid #F0F4F2' }}>
              <td style={{ padding: '8px 12px 8px 24px', color: '#3D4F47' }}>{cat.category}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: RED }}>({fmtRWF(cat.amount)})</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: SAGE }}>
                {revenue ? fmtPct(cat.amount / revenue * 100) : '—'}
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: '2px solid #E2E9E5', background: 'rgba(14,59,46,0.03)' }}>
            <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0A2820' }}>Total Expenses</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: RED }}>({fmtRWF(expenses)})</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', color: SAGE }}>{revenue ? fmtPct(expenses / revenue * 100) : '—'}</td>
          </tr>
          <tr style={{ borderTop: '2px solid #0E3B2E', background: 'rgba(14,59,46,0.06)' }}>
            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0A2820', fontFamily: "'Fraunces', serif" }}>Net Profit</td>
            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: profit >= 0 ? FOREST : RED, fontFamily: "'Fraunces', serif" }}>{profit >= 0 ? fmtRWF(profit) : `(${fmtRWF(Math.abs(profit))})`}</td>
            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: profit >= 0 ? FOREST : RED }}>{fmtPct(kpis?.margin_pct)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Recent transactions table ─────────────────────────────────────────────────
function TransactionsTable({ rows = [] }) {
  if (!rows.length) return <p style={{ color: SAGE, fontSize: 13, padding: '16px 0' }}>No transactions in this period.</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #E2E9E5' }}>
            {['Date', 'Description', 'Category', 'Amount', 'Type'].map(h => (
              <th key={h} style={{ textAlign: h === 'Amount' ? 'right' : 'left', padding: '8px 12px', color: SAGE, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid #F0F4F2' }}>
              <td style={{ padding: '8px 12px', color: SAGE, whiteSpace: 'nowrap' }}>{r.date}</td>
              <td style={{ padding: '8px 12px', color: '#3D4F47', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '—'}</td>
              <td style={{ padding: '8px 12px', color: SAGE }}>{r.category}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: r.type === 'income' ? FOREST : RED }}>{r.type === 'income' ? '+' : '-'}{fmtRWF(r.amount)}</td>
              <td style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: r.type === 'income' ? 'rgba(14,59,46,0.08)' : 'rgba(156,75,62,0.08)', color: r.type === 'income' ? FOREST : RED }}>
                  {r.type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Budget vs Actual ─────────────────────────────────────────────────────────
function BudgetRow({ row, budgetMonth, onSaved }) {
  const qc = useQueryClient()
  const [inputVal, setInputVal] = useState('')
  const [loadingSuggest, setLoadingSuggest] = useState(false)

  const mutation = useMutation({
    mutationFn: (data) => saveBudget(data),
    onSuccess: () => {
      toast.success(`Budget saved for ${row.category}`)
      qc.invalidateQueries({ queryKey: ['financial-analytics'] })
      onSaved()
    },
    onError: () => toast.error('Could not save budget.'),
  })

  const handleSuggest = useCallback(async () => {
    setLoadingSuggest(true)
    try {
      const res = await getBudgetSuggestions(budgetMonth)
      const match = res.data.find(s => s.category_name === row.category)
      if (match) {
        setInputVal(String(match.suggested_amount))
        toast.success(`AI suggestion loaded for ${row.category}`)
      } else {
        toast('No history found — enter a budget manually.')
      }
    } catch {
      toast.error('Could not fetch suggestion.')
    } finally {
      setLoadingSuggest(false)
    }
  }, [budgetMonth, row.category])

  const handleSave = () => {
    const amount = parseFloat(inputVal)
    if (!amount || amount <= 0) { toast.error('Enter a valid amount.'); return }
    mutation.mutate({
      category_id:      row.category_id,
      month:            budgetMonth,
      budgeted_amount:  amount,
      is_ai_suggested:  false,
    })
  }

  const overspend = row.budgeted_amount != null && row.actual > row.budgeted_amount
  const pct = row.budgeted_amount ? Math.round(row.actual / row.budgeted_amount * 100) : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 1fr auto', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #F0F4F2' }}>
      {/* Category + bar */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#0A2820', margin: '0 0 6px' }}>{row.category}</p>
        {row.budgeted_amount != null && (
          <div style={{ height: 6, borderRadius: 3, background: '#E2E9E5', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${Math.min(pct, 100)}%`,
              background: overspend ? RED : FOREST,
              transition: 'width 0.4s',
            }} />
          </div>
        )}
      </div>
      {/* Actual */}
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: 11, color: SAGE, margin: '0 0 2px' }}>Actual</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: RED, margin: 0 }}>{fmtRWF(row.actual)}</p>
      </div>
      {/* Budget */}
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: 11, color: SAGE, margin: '0 0 2px' }}>Budget</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: row.budgeted_amount != null ? (overspend ? RED : FOREST) : SAGE, margin: 0 }}>
          {row.budgeted_amount != null ? fmtRWF(row.budgeted_amount) : '—'}
          {overspend && <span style={{ fontSize: 10, marginLeft: 4, color: RED }}>+{fmtPct((row.actual - row.budgeted_amount) / row.budgeted_amount * 100)} over</span>}
        </p>
      </div>
      {/* Input */}
      <input
        type="number" min="0" placeholder="Set budget…"
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        style={{ border: '1px solid #E2E9E5', borderRadius: 10, padding: '7px 12px', fontSize: 13, color: '#0A2820', background: '#fff', outline: 'none', width: '100%' }}
      />
      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleSuggest} disabled={loadingSuggest}
          title="Use AI suggestion"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 10, border: `1px solid ${GOLD}`, background: '#FEF9EC', color: GOLD, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          <Sparkles size={13} />
          {loadingSuggest ? '…' : 'AI'}
        </button>
        <button
          onClick={handleSave} disabled={mutation.isPending || !inputVal}
          title="Save budget"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 10, border: `1px solid ${FOREST}`, background: FOREST, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          <Save size={13} />
          {mutation.isPending ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function BudgetVsActual({ rows = [], budgetMonth }) {
  const [key, setKey] = useState(0) // force re-render after save to clear inputs
  if (!rows.length) return (
    <Card className="p-5">
      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2820', marginBottom: 6 }}>Budget vs Actual</p>
      <p style={{ fontSize: 13, color: SAGE }}>No expense data in this period to set budgets for.</p>
    </Card>
  )
  return (
    <Card className="p-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2820', margin: 0 }}>Budget vs Actual</p>
        <p style={{ fontSize: 11, color: SAGE, margin: 0 }}>Budgets apply to the month of your selected end date</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 1fr auto', gap: 12, padding: '8px 0', borderBottom: '2px solid #E2E9E5' }}>
        {['Category', 'Actual', 'Budget', 'Set / Edit Budget', ''].map(h => (
          <p key={h} style={{ fontSize: 11, fontWeight: 600, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, textAlign: h === 'Actual' || h === 'Budget' ? 'right' : 'left' }}>{h}</p>
        ))}
      </div>
      {rows.map(row => (
        <BudgetRow key={`${row.category}-${key}`} row={row} budgetMonth={budgetMonth} onSaved={() => setKey(k => k + 1)} />
      ))}
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FinancialAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState(daysAgo(29))
  const [dateTo,   setDateTo]   = useState(today())

  const { data, isLoading, isError } = useQuery({
    queryKey: ['financial-analytics', dateFrom, dateTo],
    queryFn: () => getFinancialAnalytics({ from: dateFrom, to: dateTo }).then(r => r.data),
    keepPreviousData: true,
  })

  const kpis = data?.kpis ?? {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: '#0A2820', margin: 0 }}>Financial Analytics</h1>
          <p style={{ fontSize: 13, color: SAGE, marginTop: 4 }}>Deep-dive P&L, trends and cash flow from your real data</p>
        </div>
        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Calendar size={15} style={{ color: SAGE }} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ border: '1px solid #E2E9E5', borderRadius: 10, padding: '7px 12px', fontSize: 13, color: '#0A2820', background: '#fff', outline: 'none' }} />
          <span style={{ color: SAGE, fontSize: 13 }}>→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ border: '1px solid #E2E9E5', borderRadius: 10, padding: '7px 12px', fontSize: 13, color: '#0A2820', background: '#fff', outline: 'none' }} />
          {[7, 30, 90].map(n => (
            <button key={n} onClick={() => { setDateFrom(daysAgo(n - 1)); setDateTo(today()) }}
              style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #E2E9E5', background: '#fff', color: SAGE, fontSize: 12, cursor: 'pointer' }}>
              {n}d
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Card key={i} className="h-28 animate-pulse" style={{ background: '#E2E9E5' }} />)}
        </div>
      )}

      {isError && (
        <Card className="p-8 text-center">
          <p style={{ color: RED }}>Could not load analytics. Make sure you have sales and expense data entered.</p>
        </Card>
      )}

      {data && (
        <>
          {/* Insight banner */}
          <BiggestDragInsight data={data} />

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Revenue" value={fmtRWF(kpis.revenue)} icon={TrendingUp} />
            <KPICard label="Total Expenses" value={fmtRWF(kpis.expenses)} icon={TrendingDown} />
            <KPICard label="Net Profit" value={fmtRWF(kpis.net_profit)} icon={DollarSign} warn={kpis.net_profit < 0} sub={kpis.net_profit < 0 ? 'Operating at a loss' : undefined} />
            <KPICard label="Net Margin" value={fmtPct(kpis.margin_pct)} icon={Percent} warn={kpis.margin_pct < 10} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Cash Balance" value={fmtRWF(kpis.cash_balance)} icon={Droplets} warn={kpis.cash_balance < 0} />
            <KPICard
              label="Cash Runway"
              value={kpis.runway_months != null ? `${kpis.runway_months} mo` : 'N/A'}
              icon={Calendar}
              warn={kpis.runway_months != null && kpis.runway_months < 3}
              sub={kpis.runway_months != null && kpis.runway_months < 3 ? 'Less than 3 months — act now' : undefined}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by source */}
            <Card className="p-5">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2820', marginBottom: 16 }}>Revenue by Source</p>
              {data.revenue_by_source?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.revenue_by_source} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E9E5" />
                    <XAxis dataKey="source" tick={{ fontSize: 11, fill: SAGE }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: SAGE }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<TooltipBox formatter={fmtRWF} />} />
                    <Bar dataKey="amount" name="Revenue" fill={FOREST} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: SAGE, fontSize: 13 }}>No revenue data in this period.</p>}
            </Card>

            {/* Expense by category */}
            <Card className="p-5">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2820', marginBottom: 16 }}>Expenses by Category</p>
              {data.expense_by_category?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.expense_by_category} layout="vertical" margin={{ top: 0, right: 40, left: 60, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E9E5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: SAGE }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: SAGE }} tickLine={false} axisLine={false} width={55} />
                    <Tooltip content={<TooltipBox formatter={fmtRWF} />} />
                    <Bar dataKey="amount" name="Expenses" radius={[0, 6, 6, 0]}
                      fill={RED}
                      label={{ position: 'right', fontSize: 10, fill: SAGE, formatter: (v, entry) => entry?.mom_pct != null ? `${entry.mom_pct > 0 ? '+' : ''}${entry.mom_pct}%` : '' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: SAGE, fontSize: 13 }}>No expense data in this period.</p>}
            </Card>
          </div>

          {/* Monthly trend charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Expenses trend */}
            <Card className="p-5">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2820', marginBottom: 16 }}>Revenue vs Expenses (6 months)</p>
              {data.monthly_trend?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.monthly_trend} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E9E5" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: SAGE }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: SAGE }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<TooltipBox formatter={fmtRWF} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenue"  name="Revenue"  fill={FOREST} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill={RED}    radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: SAGE, fontSize: 13 }}>Not enough monthly data yet.</p>}
            </Card>

            {/* Margin trend */}
            <Card className="p-5">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2820', marginBottom: 16 }}>Margin Trend (6 months)</p>
              {data.monthly_trend?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.monthly_trend} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E9E5" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: SAGE }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: SAGE }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<TooltipBox formatter={fmtPct} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="gross_margin" name="Gross Margin" stroke={FOREST} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="net_margin"   name="Net Margin"   stroke={GOLD}   strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p style={{ color: SAGE, fontSize: 13 }}>Not enough monthly data yet.</p>}
            </Card>
          </div>

          {/* Cash flow line */}
          {data.monthly_trend?.length > 0 && (
            <Card className="p-5">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2820', marginBottom: 16 }}>Cash Balance Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.monthly_trend} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E9E5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: SAGE }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: SAGE }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<TooltipBox formatter={fmtRWF} />} />
                  <Line type="monotone" dataKey="cash_balance" name="Cash Balance" stroke={GOLD} strokeWidth={2.5} dot={{ r: 3, fill: GOLD }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* P&L table */}
          <Card className="p-5">
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2820', marginBottom: 16 }}>Profit & Loss Breakdown</p>
            <PLTable kpis={kpis} expense_by_category={data.expense_by_category} />
          </Card>

          {/* Budget vs actual */}
          <BudgetVsActual rows={data.budget_vs_actual} budgetMonth={dateTo} />

          {/* Recent transactions */}
          <Card className="p-5">
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2820', marginBottom: 16 }}>Recent Transactions</p>
            <TransactionsTable rows={data.recent_transactions} />
          </Card>
        </>
      )}
    </div>
  )
}
