import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLatestScore, getScoreHistory, computeScore } from '../api'
import HealthScoreGauge from '../components/dashboard/HealthScoreGauge'
import ScoreTrendChart from '../components/dashboard/ScoreTrendChart'
import KPICards from '../components/dashboard/KPICards'
import Recommendations, { fmtVal } from '../components/dashboard/Recommendations'
import ProfitLossCard from '../components/dashboard/ProfitLossCard'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { RefreshCw, Calendar, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const today = () => new Date().toISOString().split('T')[0]

// Single source of truth for "most urgent recommendation" used by both
// BiggestDrag and ExecutiveSummary.
function topRecommendation(recommendations = []) {
  return [
    ...recommendations.filter(r => r.urgency === 'high'),
    ...recommendations.filter(r => r.urgency === 'medium'),
    ...recommendations.filter(r => r.urgency === 'low'),
  ][0] ?? null
}

const FEATURE_LABELS = {
  gross_profit_margin:      'Gross Profit Margin',
  expense_to_revenue_ratio: 'Expense-to-Revenue Ratio',
  customer_retention_rate:  'Customer Retention',
  inventory_turnover_rate:  'Inventory Turnover',
  total_sales_normalised:   'Daily Sales Volume',
}

function ExecutiveSummary({ score, topRec }) {
  const profitable = parseFloat(score?.total_sales ?? 0) - parseFloat(score?.total_expenses ?? 0) >= 0
  const feature = topRec ? (FEATURE_LABELS[topRec.feature] ?? topRec.feature.replace(/_/g, ' ')) : null

  let text, style
  if (profitable && topRec?.urgency === 'high') {
    text  = `Your business is profitable but losing money to ${feature.toLowerCase()} — fixing this is your #1 lever this month.`
    style = 'bg-amber-50 border-amber-200 text-amber-800'
  } else if (profitable) {
    text  = `Your business is profitable and healthy — keep monitoring ${feature ?? 'your key metrics'} to stay on track.`
    style = 'bg-emerald-50 border-emerald-200 text-emerald-800'
  } else if (topRec?.urgency === 'high') {
    text  = `Your business is currently operating at a loss, largely driven by ${feature.toLowerCase()} — this needs immediate attention.`
    style = 'bg-red-50 border-red-200 text-red-800'
  } else {
    text  = `Your business is currently operating at a loss — review your Reports page for a full breakdown.`
    style = 'bg-gray-50 border-gray-200 text-gray-700'
  }

  return (
    <p className={`text-sm px-4 py-3 rounded-xl border ${style}`}>
      {text}
    </p>
  )
}

function BiggestDrag({ recommendations = [], onClickFeature }) {
  const top = topRecommendation(recommendations)
  if (!top) return null

  if (top.urgency === 'low') {
    return (
      <p className="text-xs text-emerald-600 font-medium mt-3">
        ✓ No urgent issues — strongest metric: {top.title}
      </p>
    )
  }

  const label = top.feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const current = fmtVal(top.current_value, top.unit)
  const target  = fmtVal(top.target_value,  top.unit)

  return (
    <button
      onClick={() => onClickFeature(top.feature)}
      className="mt-3 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
    >
      <span className="text-gray-500">Biggest drag:</span>
      <span>{label} ({current} vs {target} target)</span>
      <ArrowRight size={13} />
    </button>
  )
}

export default function DashboardPage() {
  const { can, business } = useAuth()
  const qc = useQueryClient()
  const [targetDate, setTargetDate] = useState(today())
  const [highlightFeature, setHighlightFeature] = useState(null)
  const recsRef = useRef(null)

  const { data: latest, isLoading: latestLoading } = useQuery({
    queryKey: ['latest-score'],
    queryFn: () => getLatestScore().then(r => r.data),
    retry: 1,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['score-history'],
    queryFn: () => getScoreHistory().then(r => r.data.results ?? r.data),
  })

  const compute = useMutation({
    mutationFn: (date) => computeScore(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['latest-score'] })
      qc.invalidateQueries({ queryKey: ['score-history'] })
      toast.success('Health score computed successfully.')
    },
    onError: (err) => {
      const msg = err.response?.data?.error ?? 'Could not compute score — make sure data exists for this date.'
      toast.error(msg)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Health Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{business?.name ?? 'Business Health Dashboard'}</p>
        </div>
        {can.computeScore && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="text-sm text-gray-700 bg-transparent focus:outline-none"
              />
            </div>
            <Button
              onClick={() => compute.mutate(targetDate)}
              disabled={compute.isPending}
              size="md"
            >
              <RefreshCw size={15} className={compute.isPending ? 'animate-spin' : ''} />
              {compute.isPending ? 'Computing…' : 'Compute Score'}
            </Button>
          </div>
        )}
      </div>

      {latestLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : !latest ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 text-lg font-medium">No health score computed yet.</p>
          <p className="text-gray-400 text-sm mt-2">
            Add sales, expenses, inventory, and customer data, then click <strong>Compute Score</strong>.
          </p>
        </Card>
      ) : (
        <>
          <ExecutiveSummary score={latest} topRec={topRecommendation(latest.recommendations)} />

          {/* Hero row — health score centrepiece */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 flex flex-col items-center justify-center py-8 bg-gradient-to-b from-indigo-50 to-white border-indigo-100">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">Business Health Score</p>
              <HealthScoreGauge score={latest.score} label={latest.label} trend={latest.trend} />
              <BiggestDrag
                recommendations={latest.recommendations}
                onClickFeature={(feature) => {
                  setHighlightFeature(feature)
                  recsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              />
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                  Last computed: {new Date(latest.updated_at).toLocaleString('en-RW', {
                    dateStyle: 'medium', timeStyle: 'short'
                  })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">For date: {latest.date}</p>
              </div>
            </Card>

            <div className="lg:col-span-2 flex flex-col gap-6">
              <ProfitLossCard score={latest} />
              <Card className="flex-1">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">30-Day Score Trend</h2>
                <ScoreTrendChart data={history} />
              </Card>
            </div>
          </div>

          <KPICards score={latest} />

          <div ref={recsRef}>
          {latest.recommendations?.length > 0 && (
            <Recommendations recommendations={latest.recommendations} highlightFeature={highlightFeature} />
          )}
          </div>

        </>
      )}
    </div>
  )
}
