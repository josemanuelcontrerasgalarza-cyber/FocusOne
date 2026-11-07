import { useId } from 'react'
import { monotonePath } from '../lib/curve'

/** Tiny trend line with a soft gradient fill. Draws itself in on mount. */
export function Sparkline({ data, trend = 'up', width = 120, height = 40 }) {
  const id = useId().replace(/:/g, '')
  const pad = 3
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ])
  const line = monotonePath(pts)
  const area = `${line} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`
  const [ex, ey] = pts[pts.length - 1]

  return (
    <svg className={`spark spark--${trend}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="spark__area" d={area} fill={`url(#sg-${id})`} />
      <path className="spark__line" d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" pathLength="1" />
      <circle className="spark__end" cx={ex} cy={ey} r="3" fill="currentColor" />
    </svg>
  )
}
