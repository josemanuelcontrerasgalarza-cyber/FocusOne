/**
 * Monotone cubic interpolation (Fritsch–Carlson) → SVG path.
 * Smooth like a spline but never overshoots the data, so a curve
 * between two equal values stays flat and nothing dips below zero.
 * `pts` is an array of [x, y] in pixel space, sorted by x.
 */
export function monotonePath(pts) {
  const n = pts.length
  if (n === 0) return ''
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`
  const dx = []
  const slope = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0]
    slope[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]
  }
  const m = new Array(n)
  m[0] = slope[0]
  m[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / slope[i]
    const b = m[i + 1] / slope[i]
    const h = a * a + b * b
    if (h > 9) {
      const t = 3 / Math.sqrt(h)
      m[i] = t * a * slope[i]
      m[i + 1] = t * b * slope[i]
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const c = dx[i] / 3
    d += ` C${x0 + c},${y0 + m[i] * c} ${x1 - c},${y1 - m[i + 1] * c} ${x1},${y1}`
  }
  return d
}

/** "Nice" axis maximum and tick step for a value range starting at 0. */
export function niceScale(max, ticks = 4) {
  if (max <= 0) return { max: 1, step: 1 }
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s >= raw)
  return { max: step * Math.ceil(max / step), step }
}

export function formatCompact(v, unit = '') {
  if (unit) return `${v}${unit}`
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(v)
}
