import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

export const fmtVal = (n, unit = '') => {
  const cleanUnit = unit.replace('/month', '')
  const num = parseFloat(n)
  if (isNaN(num)) return '—'
  return `${num.toFixed(1)}${cleanUnit}`
}

const FEATURE_LABELS = {
  gross_profit_margin:      'Gross Profit Margin',
  expense_to_revenue_ratio: 'Expense-to-Revenue Ratio',
  customer_retention_rate:  'Customer Retention',
  inventory_turnover_rate:  'Inventory Turnover',
  total_sales_normalised:   'Daily Sales Volume',
  num_transactions:         'Transaction Count',
}

// Color tokens
const STATUS = {
  high:   { color: '#9C4B3E', label: 'Needs attention' },
  medium: { color: '#C9A15C', label: 'Worth improving' },
  low:    { color: '#0E3B2E', label: 'Looking good'    },
}

const SAGE       = '#6B7B74'
const SAGE_LIGHT = '#9AABA4'
const GOLD       = '#C9A15C'

function StatusIcon({ urgency, size = 20 }) {
  const color = STATUS[urgency]?.color ?? STATUS.medium.color
  const iconStyle = { color, strokeWidth: 1.5 }
  const wrapStyle = {
    width: 44, height: 44, borderRadius: '50%',
    border: `1.5px solid ${color}40`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }
  const Icon = urgency === 'low'
    ? TrendingUp
    : urgency === 'high'
      ? AlertTriangle
      : TrendingDown

  return (
    <div style={wrapStyle}>
      <Icon size={size} style={iconStyle} />
    </div>
  )
}

function RecommendationCard({ rec, index, highlight }) {
  const [expanded, setExpanded] = useState(index === 0 || highlight)
  const cardRef = useRef(null)
  const status = STATUS[rec.urgency] ?? STATUS.medium
  const featureLabel = FEATURE_LABELS[rec.feature] ?? rec.feature
  const isGood = rec.urgency === 'low'

  useEffect(() => {
    if (highlight) {
      setExpanded(true)
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight])

  const nowColor = rec.state === 'bad' ? STATUS.high.color : STATUS.low.color

  return (
    <div
      ref={cardRef}
      style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: highlight
          ? `0 0 0 2px ${status.color}40, 0 1px 2px rgba(10,40,32,0.05), 0 1px 12px rgba(10,40,32,0.04)`
          : '0 1px 2px rgba(10,40,32,0.05), 0 1px 12px rgba(10,40,32,0.04)',
        padding: '30px 34px',
        position: 'relative',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Left accent line */}
      <div style={{
        position: 'absolute', left: 0, top: 22, bottom: 22,
        width: 2, borderRadius: 2,
        background: status.color,
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1, minWidth: 0 }}>
          <StatusIcon urgency={rec.urgency} />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Eyebrow: feature label · status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                fontSize: 11.5, fontWeight: 600, color: SAGE,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {featureLabel}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: SAGE_LIGHT, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: status.color }}>
                {status.label}
              </span>
            </div>

            {/* Title */}
            <h3 style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 18, fontWeight: 500,
              color: '#1A2420', margin: 0, lineHeight: 1.3,
            }}>
              {rec.title}
            </h3>

            {/* Metric comparison */}
            {rec.current_value !== undefined && (
              <div style={{
                display: 'flex', alignItems: 'stretch', gap: 0,
                marginTop: 16,
                border: '1px solid #E8EDEB', borderRadius: 8,
                overflow: 'hidden', width: 'fit-content',
              }}>
                {/* Now block */}
                <div style={{ padding: '10px 20px', minWidth: 90 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: SAGE_LIGHT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Now
                  </div>
                  <div style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 28, fontWeight: 500, color: nowColor, lineHeight: 1,
                  }}>
                    {fmtVal(rec.current_value, rec.unit)}
                  </div>
                </div>
                {/* Divider */}
                <div style={{ width: 1, background: '#E8EDEB', flexShrink: 0 }} />
                {/* Target block */}
                <div style={{ padding: '10px 20px', minWidth: 90 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: SAGE_LIGHT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Target
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                    fontSize: 18, fontWeight: 500, color: SAGE, lineHeight: 1,
                  }}>
                    {fmtVal(rec.target_value, rec.unit)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ color: SAGE_LIGHT, background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginTop: 2, flexShrink: 0 }}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 20, paddingLeft: 60 }}>
          {/* Body text */}
          {rec.body && (
            <p style={{
              fontSize: 13.5, color: SAGE, lineHeight: 1.7,
              maxWidth: 880, margin: '0 0 16px 0',
            }}>
              {rec.body}
            </p>
          )}

          {/* What to do */}
          {rec.actions?.length > 0 && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: STATUS.low.color,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 10,
              }}>
                What to do
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {rec.actions.map((action, i) => (
                  <li key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    marginBottom: 12, lineHeight: 1.5,
                  }}>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                      fontSize: 12, fontWeight: 500, color: GOLD,
                      flexShrink: 0, marginTop: 1,
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 13.5, color: SAGE, lineHeight: 1.5 }}>
                      {action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Recommendations({ recommendations = [], highlightFeature = null }) {
  const urgent = recommendations.filter(r => r.urgency === 'high')
  const rest   = recommendations.filter(r => r.urgency !== 'high')
  const sorted = [...urgent, ...rest]

  if (!sorted.length) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(10,40,32,0.05), 0 1px 12px rgba(10,40,32,0.04)',
        padding: '30px 34px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: `1.5px solid ${STATUS.low.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <CheckCircle size={20} style={{ color: STATUS.low.color, strokeWidth: 1.5 }} />
        </div>
        <div>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 500, color: '#1A2420', margin: '0 0 4px 0' }}>
            Business is in great shape!
          </p>
          <p style={{ fontSize: 13.5, color: SAGE, margin: 0, lineHeight: 1.6 }}>
            All key metrics are performing well. No critical actions required right now.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A2420', margin: '0 0 2px 0' }}>AI Recommendations</h2>
          <p style={{ fontSize: 12, color: SAGE_LIGHT, margin: 0 }}>
            Powered by ML - ranked by impact on your health score
          </p>
        </div>
        {urgent.length > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, color: STATUS.high.color,
            border: `1px solid ${STATUS.high.color}30`,
            borderRadius: 20, padding: '5px 12px',
          }}>
            <AlertTriangle size={12} strokeWidth={1.5} />
            {urgent.length} urgent
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((rec, i) => (
          <RecommendationCard key={rec.feature} rec={rec} index={i} highlight={rec.feature === highlightFeature} />
        ))}
      </div>
    </div>
  )
}
