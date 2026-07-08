import { useState } from 'react'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Lightbulb, Zap, Info
} from 'lucide-react'

const FEATURE_LABELS = {
  gross_profit_margin:      'Gross Profit Margin',
  expense_to_revenue_ratio: 'Expense-to-Revenue Ratio',
  customer_retention_rate:  'Customer Retention',
  inventory_turnover_rate:  'Inventory Turnover',
  total_sales_normalised:   'Daily Sales Volume',
  num_transactions:         'Transaction Count',
}

const URGENCY = {
  high: {
    bar:    'bg-red-500',
    badge:  'bg-red-50 text-red-600 border border-red-200',
    icon:   <AlertTriangle size={14} />,
    label:  'Needs attention',
    glow:   'shadow-red-100',
  },
  medium: {
    bar:    'bg-amber-400',
    badge:  'bg-amber-50 text-amber-600 border border-amber-200',
    icon:   <Zap size={14} />,
    label:  'Worth improving',
    glow:   'shadow-amber-100',
  },
  low: {
    bar:    'bg-emerald-400',
    badge:  'bg-emerald-50 text-emerald-600 border border-emerald-200',
    icon:   <CheckCircle2 size={14} />,
    label:  'Looking good',
    glow:   'shadow-emerald-100',
  },
}

function RecommendationCard({ rec, index }) {
  const [expanded, setExpanded] = useState(index === 0)
  const urgency = URGENCY[rec.urgency] ?? URGENCY.medium
  const isPositive = rec.urgency === 'low'

  return (
    <div className={`bg-white rounded-2xl shadow-sm ${urgency.glow} border border-gray-100 overflow-hidden transition-all duration-200`}>
      {/* Urgency bar */}
      <div className={`h-1 w-full ${urgency.bar}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isPositive ? 'bg-emerald-50' : rec.urgency === 'high' ? 'bg-red-50' : 'bg-amber-50'
            }`}>
              {isPositive
                ? <TrendingUp size={18} className="text-emerald-600" />
                : <TrendingDown size={18} className={rec.urgency === 'high' ? 'text-red-500' : 'text-amber-500'} />
              }
            </div>

            <div className="flex-1 min-w-0">
              {/* Feature tag + urgency badge */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {FEATURE_LABELS[rec.feature] ?? rec.feature}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${urgency.badge}`}>
                  {urgency.icon}
                  {urgency.label}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold text-gray-900 leading-snug">
                {rec.title}
              </h3>
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-1"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 space-y-4 pl-13">
            {/* Body text */}
            <p className="text-sm text-gray-600 leading-relaxed pl-[52px]">
              {rec.body}
            </p>

            {/* Action steps */}
            {rec.actions?.length > 0 && (
              <div className="pl-[52px]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb size={13} className="text-indigo-500" />
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                    What to do
                  </span>
                </div>
                <ul className="space-y-2">
                  {rec.actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SHAP impact note */}
            <div className="pl-[52px]">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Info size={11} />
                ML impact score: {rec.impact > 0 ? '+' : ''}{rec.impact?.toFixed(3)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Recommendations({ recommendations = [] }) {
  const urgent = recommendations.filter(r => r.urgency === 'high')
  const rest   = recommendations.filter(r => r.urgency !== 'high')
  const sorted = [...urgent, ...rest]

  if (!sorted.length) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-emerald-800">Business is in great shape!</p>
            <p className="text-sm text-emerald-600 mt-0.5">
              All key metrics are performing well. No critical actions required right now.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">AI Recommendations</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Powered by ML — ranked by impact on your health score
          </p>
        </div>
        {urgent.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
            <AlertTriangle size={12} />
            {urgent.length} urgent
          </span>
        )}
      </div>

      {sorted.map((rec, i) => (
        <RecommendationCard key={rec.feature} rec={rec} index={i} />
      ))}
    </div>
  )
}
