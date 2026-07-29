function pt(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function arc(cx, cy, r, startDeg, sweepDeg) {
  const [x1, y1] = pt(cx, cy, r, startDeg)
  const [x2, y2] = pt(cx, cy, r, startDeg + sweepDeg)
  const large = sweepDeg > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

const CX = 100, CY = 105, R = 78, SW = 13
const START = 225, TOTAL = 270

const STATUS = {
  EXCELLENT: { label: 'Excellent', color: '#0E3B2E' },
  GOOD:      { label: 'Good',      color: '#0E3B2E' },
  FAIR:      { label: 'Fair',      color: '#C9A15C' },
  POOR:      { label: 'Poor',      color: '#9C4B3E' },
  CRITICAL:  { label: 'Critical',  color: '#9C4B3E' },
}

const TREND_ICON = {
  UP:     { icon: '↑', color: '#0E3B2E' },
  DOWN:   { icon: '↓', color: '#9C4B3E' },
  STABLE: { icon: '→', color: '#7A9184' },
}

export default function HealthScoreGauge({ score, label, trend }) {
  const value = Math.min(100, Math.max(0, parseFloat(score ?? 0)))
  const scoreSweep = (value / 100) * TOTAL
  const status = STATUS[label] ?? STATUS.FAIR
  const trendInfo = TREND_ICON[trend] ?? TREND_ICON.STABLE

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        {/* Glow layer behind ring */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 140, height: 140,
          borderRadius: '50%',
          background: 'rgba(14,59,46,0.18)',
          filter: 'blur(18px)',
          pointerEvents: 'none',
        }} />

        <svg viewBox="0 0 200 210" style={{ width: '100%', height: '100%' }}>
          {/* Track */}
          <path
            d={arc(CX, CY, R, START, TOTAL)}
            fill="none" stroke="#E2E9E5" strokeWidth={SW} strokeLinecap="round"
          />
          {/* Score arc */}
          {value > 0 && (
            <path
              d={arc(CX, CY, R, START, scoreSweep)}
              fill="none" stroke="#0E3B2E" strokeWidth={SW} strokeLinecap="round"
            />
          )}
        </svg>

        {/* Centre text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          paddingBottom: 16,
        }}>
          <span style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 52, fontWeight: 500, lineHeight: 1, color: '#0A2820',
          }}>
            {value.toFixed(0)}
          </span>
          <span style={{ fontSize: 12, color: '#B7C4BC', marginTop: 2 }}>/ 100</span>
        </div>
      </div>

      {/* Status pill + live dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, color: status.color,
          background: `${status.color}12`,
          border: `1px solid ${status.color}30`,
          borderRadius: 20, padding: '4px 10px',
        }}>
          {/* Live dot with glow */}
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: status.color, flexShrink: 0,
            boxShadow: `0 0 0 3px rgba(14,59,46,0.18), 0 0 8px ${status.color}80`,
          }} />
          {status.label}
        </span>

        {/* Momentum */}
        {trend && (
          <span style={{ fontSize: 12, fontWeight: 500, color: trendInfo.color }}>
            {trendInfo.icon} {trend}
          </span>
        )}
      </div>
    </div>
  )
}
