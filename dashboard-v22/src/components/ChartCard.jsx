import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'
import { formatCompact, monotonePath, niceScale } from '../lib/curve'
import './ChartCard.css'

const MIN_H = 220
const M = { top: 16, right: 12, bottom: 30, left: 44 }

/** Size of an element, kept in sync with ResizeObserver (so the SVG draws at real pixels). */
function useSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) =>
      setSize({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) }),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size]
}

export function ChartCard({ analytics, style }) {
  const rangeKeys = Object.keys(analytics.ranges)
  const [range, setRange] = useState('week')
  const [type, setType] = useState('area')
  const [active, setActive] = useState(null)
  const [wrapRef, { w: width, h: plotH }] = useSize()
  const H = Math.max(MIN_H, plotH)
  const gid = useId().replace(/:/g, '')

  const r = analytics.ranges[range]
  const { points, unit = '' } = r
  const values = points.map((p) => p.value)
  const scale = niceScale(Math.max(...values), 4)
  const ticks = Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step)

  const innerW = Math.max(0, width - M.left - M.right)
  const innerH = H - M.top - M.bottom
  const band = innerW / points.length
  const x = (i) => M.left + band * i + band / 2
  const y = (v) => M.top + innerH - (v / scale.max) * innerH
  const pts = points.map((p, i) => [x(i), y(p.value)])
  const line = monotonePath(pts)
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${M.top + innerH} L${pts[0][0]},${M.top + innerH} Z` : ''
  const barW = Math.min(34, band * 0.52)
  const animKey = `${range}-${type}-${width > 0}`

  const peak = values.indexOf(Math.max(...values))
  const summary = `${analytics.metric} by ${r.label.toLowerCase()}: ${points.map((p) => `${p.label} ${formatCompact(p.value, unit)}`).join(', ')}. Peak on ${points[peak].label}.`

  const onKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const last = points.length - 1
    const cur = active ?? (e.key === 'ArrowLeft' ? last + 1 : -1)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? last : Math.min(last, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1)))
    setActive(next)
  }

  const tip = active != null && width > 0 ? { left: x(active), top: y(values[active]), p: points[active] } : null

  return (
    <section className="card chart" style={style} aria-labelledby="chart-title">
      <div className="chart__head">
        <div>
          <h2 id="chart-title" className="card-title">
            {analytics.title}
          </h2>
          <div className="chart__total">
            <span className="chart__total-value">{r.total}</span>
            <span className="trend up">
              <Icon name="trendUp" size={12} stroke={2.4} />+{r.delta}%
            </span>
            <span className="chart__total-label">{analytics.metric.toLowerCase()} this {r.label.toLowerCase()}</span>
          </div>
        </div>

        <div className="chart__controls">
          <div className="seg" role="radiogroup" aria-label="Range">
            {rangeKeys.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={range === k}
                className={`seg__opt${range === k ? ' is-on' : ''}`}
                onClick={() => {
                  setRange(k)
                  setActive(null)
                }}
              >
                {analytics.ranges[k].label}
              </button>
            ))}
          </div>
          <div className="seg seg--icons" role="radiogroup" aria-label="Chart type">
            {[
              { id: 'area', label: 'Area chart' },
              { id: 'bars', label: 'Bar chart' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={type === t.id}
                aria-label={t.label}
                className={`seg__opt${type === t.id ? ' is-on' : ''}`}
                onClick={() => setType(t.id)}
              >
                <Icon name={t.id} size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="chart__plot"
        tabIndex={0}
        role="img"
        aria-label={summary}
        onKeyDown={onKey}
        onMouseLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={H} key={animKey} aria-hidden="true">
            <defs>
              <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`bar-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.55" />
              </linearGradient>
              <clipPath id={`reveal-${gid}`}>
                <rect className="chart__reveal" x={M.left} y="0" width={innerW} height={H} />
              </clipPath>
            </defs>

            {/* Grid + y axis */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={M.left}
                  x2={M.left + innerW}
                  y1={y(t)}
                  y2={y(t)}
                  className={t === 0 ? 'chart__base' : 'chart__grid'}
                />
                <text x={M.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="chart__tick">
                  {formatCompact(t, unit)}
                </text>
              </g>
            ))}

            {/* X labels */}
            {points.map((p, i) => (
              <text key={p.label} x={x(i)} y={H - 8} textAnchor="middle" className={`chart__tick${active === i ? ' is-on' : ''}`}>
                {p.label}
              </text>
            ))}

            {type === 'area' ? (
              <g clipPath={`url(#reveal-${gid})`}>
                <path d={area} fill={`url(#area-${gid})`} className="chart__area" />
                <path d={line} className="chart__line" pathLength="1" />
              </g>
            ) : (
              <g>
                {points.map((p, i) => {
                  const h = M.top + innerH - y(p.value)
                  const bx = x(i) - barW / 2
                  const by = y(p.value)
                  const rr = Math.min(8, barW / 2, h)
                  const d = `M${bx},${by + h} V${by + rr} Q${bx},${by} ${bx + rr},${by} H${bx + barW - rr} Q${bx + barW},${by} ${bx + barW},${by + rr} V${by + h} Z`
                  return (
                    <path
                      key={p.label}
                      d={d}
                      fill={`url(#bar-${gid})`}
                      className={`chart__bar${active != null && active !== i ? ' is-dim' : ''}`}
                      style={{ '--b': i }}
                    />
                  )
                })}
              </g>
            )}

            {/* Hover crosshair + point */}
            {tip && (
              <g className="chart__hover">
                <line x1={tip.left} x2={tip.left} y1={M.top} y2={M.top + innerH} className="chart__cross" />
                {type === 'area' && (
                  <>
                    <circle cx={tip.left} cy={tip.top} r="9" className="chart__halo" />
                    <circle cx={tip.left} cy={tip.top} r="4.5" className="chart__point" />
                  </>
                )}
              </g>
            )}

            {/* Hit areas: a full-height band per point, bigger than the mark */}
            {points.map((p, i) => (
              <rect
                key={p.label}
                x={M.left + band * i}
                y={M.top}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive((a) => (a === i ? null : i))}
              />
            ))}
          </svg>
        )}

        {tip && (
          <div
            className="chart__tip"
            style={{
              left: Math.min(Math.max(tip.left, 70), width - 70),
              top: Math.max(tip.top - 14, 8),
            }}
          >
            <span className="chart__tip-label">{tip.p.label}</span>
            <span className="chart__tip-value">
              {unit ? `${tip.p.value}${unit}` : tip.p.value.toLocaleString('en-US')} <small>{analytics.metric.toLowerCase()}</small>
            </span>
          </div>
        )}
      </div>

      {/* Data table for assistive tech */}
      <table className="sr-only">
        <caption>{analytics.metric}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              <td>{formatCompact(p.value, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
