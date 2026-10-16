/**
 * Escalas y geometría de los gráficos de Kairo. Módulo PURO (sin React ni DOM)
 * para poder probarlo con `node --test`.
 */

const EPS = 1e-9
const tidy = (n: number) => Math.round(n * 1e6) / 1e6

/** Paso "bonito" (1, 2, 2.5, 5 × 10ⁿ) mayor o igual que `raw`. */
export function niceStep(raw: number, integer = false): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1
  const exp = Math.floor(Math.log10(raw))
  const base = 10 ** exp
  const f = raw / base
  const factors = integer || exp < 0 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]
  const nf = factors.find((x) => f <= x + EPS) ?? 10
  const step = tidy(nf * base)
  return integer ? Math.max(1, Math.round(step)) : step
}

function ticksFor(max: number, step: number): number[] {
  const top = tidy(Math.ceil(max / step - EPS) * step)
  const out: number[] = []
  for (let v = 0; v <= top + EPS; v = tidy(v + step)) out.push(v)
  return out
}

/**
 * Marcas del eje Y desde 0 hasta un máximo redondeado que cubre `max`.
 * `target` es el número aproximado de intervalos. Con `integer`, pasos enteros
 * (para recuentos: nunca "2,5 tareas").
 */
export function niceTicks(max: number, target = 4, opts: { integer?: boolean } = {}): number[] {
  if (!(max > 0) || !Number.isFinite(max)) return [0, 1]
  const step = niceStep(max / Math.max(1, target), opts.integer)
  return ticksFor(max, step)
}

/** Pasos de tiempo legibles (en minutos): 5m, 15m, 30m, 1h, 2h… */
const TIME_STEPS = [1, 2, 5, 10, 15, 20, 30, 60, 120, 180, 240, 300, 360, 480, 600, 720, 1200, 1440]

/** Como `niceTicks`, pero con pasos que caen en horas y medias horas. */
export function niceTimeTicks(maxMinutes: number, target = 4): number[] {
  if (!(maxMinutes > 0) || !Number.isFinite(maxMinutes)) return [0, 30]
  const raw = maxMinutes / Math.max(1, target)
  const step = TIME_STEPS.find((s) => s >= raw - EPS) ?? niceStep(raw / 60, true) * 60
  return ticksFor(maxMinutes, step)
}

/** Geometría de banda: ancho de cada hueco y de cada barra (máx. 24px, con aire). */
export function bandLayout(n: number, width: number, maxBar = 24): { slot: number; bar: number } {
  if (n <= 0 || width <= 0) return { slot: 0, bar: 0 }
  const slot = width / n
  const gap = Math.max(2, slot * 0.32)
  const bar = Math.max(1, Math.min(maxBar, slot - gap))
  return { slot, bar }
}

/**
 * Cada cuántas etiquetas del eje X se muestra una para que no se pisen.
 * `labelWidth` es el ancho aproximado de una etiqueta (con margen).
 */
export function labelStride(n: number, plotWidth: number, labelWidth: number): number {
  if (n <= 0 || plotWidth <= 0) return 1
  return Math.max(1, Math.ceil(labelWidth / (plotWidth / n)))
}

/** Índices con etiqueta, anclados al final (el dato más reciente siempre se ve). */
export function tickIndices(n: number, stride: number): number[] {
  const s = Math.max(1, Math.floor(stride))
  const out: number[] = []
  for (let i = 0; i < n; i++) if ((n - 1 - i) % s === 0) out.push(i)
  return out
}

/** Trazado de una barra vertical con esquinas superiores redondeadas y base recta. */
export function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (!(h > 0) || !(w > 0)) return ''
  const rr = Math.max(0, Math.min(r, w / 2, h))
  const f = (n: number) => tidy(n)
  return [
    `M${f(x)},${f(y + h)}`,
    `V${f(y + rr)}`,
    `Q${f(x)},${f(y)} ${f(x + rr)},${f(y)}`,
    `H${f(x + w - rr)}`,
    `Q${f(x + w)},${f(y)} ${f(x + w)},${f(y + rr)}`,
    `V${f(y + h)}`,
    'Z',
  ].join('')
}

export const clamp = (v: number, min: number, max: number) => (max < min ? min : Math.min(max, Math.max(min, v)))
