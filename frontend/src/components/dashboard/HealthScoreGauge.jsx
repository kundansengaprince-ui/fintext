import Badge from '../ui/Badge'

const scoreColor = (v) => {
  if (v >= 80) return '#10b981'
  if (v >= 65) return '#22c55e'
  if (v >= 50) return '#eab308'
  if (v >= 35) return '#f97316'
  return '#ef4444'
}

const trendIcon = { UP: '↑', DOWN: '↓', STABLE: '→' }

// Convert "degrees clockwise from top" to SVG x,y on a circle
function pt(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

// Build an SVG arc path
function arc(cx, cy, r, startDeg, sweepDeg) {
  const [x1, y1] = pt(cx, cy, r, startDeg)
  const [x2, y2] = pt(cx, cy, r, startDeg + sweepDeg)
  const large = sweepDeg > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

const CX = 100, CY = 105, R = 78, SW = 14
const START = 225, TOTAL = 270   // 270° arc, 90° gap at bottom

export default function HealthScoreGauge({ score, label, trend }) {
  const value = Math.min(100, Math.max(0, parseFloat(score ?? 0)))
  const color = scoreColor(value)
  const scoreSweep = (value / 100) * TOTAL

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-52 h-52">
        <svg viewBox="0 0 200 210" className="w-full h-full">
          {/* Background track */}
          <path
            d={arc(CX, CY, R, START, TOTAL)}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={SW}
            strokeLinecap="round"
          />
          {/* Score arc */}
          {value > 0 && (
            <path
              d={arc(CX, CY, R, START, scoreSweep)}
              fill="none"
              stroke={color}
              strokeWidth={SW}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Centre text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
          <span className="text-5xl font-bold leading-none" style={{ color }}>
            {value.toFixed(0)}
          </span>
          <span className="text-sm text-gray-400 mt-1">/ 100</span>
        </div>
      </div>

      <div className="flex items-center gap-2 -mt-2">
        {label && <Badge label={label} variant={label} />}
        {trend && (
          <span className={`text-sm font-medium ${
            trend === 'UP' ? 'text-emerald-600' : trend === 'DOWN' ? 'text-red-500' : 'text-gray-500'
          }`}>
            {trendIcon[trend]} {trend}
          </span>
        )}
      </div>
    </div>
  )
}
