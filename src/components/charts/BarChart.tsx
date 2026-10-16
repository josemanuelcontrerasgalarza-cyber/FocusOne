'use client'

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import clsx from 'clsx'
import { ChartStyles } from './ChartStyles'
import { bandLayout, barPath, clamp, labelStride, niceTicks, niceTimeTicks, tickIndices } from './scale'
import { useElementWidth } from './useWidth'

export interface BarDatum {
  key: string
  /** Etiqueta corta del eje X (p. ej. "lun"). */
  tick: string
  /** Segunda línea opcional del eje X (p. ej. "12"). */
  tickSub?: string
  /** Etiqueta completa (tooltip, lector de pantalla, tabla): "lun 12 oct". */
  label: string
  value: number
  /** Meta para este punto (se dibuja como línea discontinua escalonada). */
  target?: number | null
  /** Detalle adicional para tooltip y lectores ("62 % de la meta"). */
  note?: string
}

export interface BarChartProps {
  /** Nombre del gráfico (grupo navegable y título de la tabla accesible). */
  title: string
  /** Resumen en una frase para lectores de pantalla (role="img"). */
  summary: string
  data: BarDatum[]
  /** `minutes` usa marcas de reloj (15m, 1h…); `count`, enteros. */
  kind?: 'minutes' | 'count'
  /** Formato compacto: tooltip y eje Y. */
  format: (v: number) => string
  /** Formato largo para lectores de pantalla (por defecto, `format`). */
  formatLong?: (v: number) => string
  /** Formato de las marcas del eje Y (por defecto, `format`). */
  formatTick?: (v: number) => string
  tone?: 'accent' | 'ink'
  /** Índice destacado (el resto se atenúa). */
  highlightIndex?: number | null
  height?: number
  categoryHeader?: string
  valueHeader?: string
  /** Nombre de la serie y de la meta para la leyenda (solo si hay meta). */
  seriesLabel?: string
  targetLabel?: string
  className?: string
}

const FILL = {
  accent: { on: 'fill-accent-fg', off: 'fill-accent-fg/30' },
  ink: { on: 'fill-ink-dim', off: 'fill-ink-dim/30' },
} as const

const crisp = (y: number) => Math.round(y) + 0.5

/**
 * Gráfico de columnas en SVG, sin dependencias: rejilla de 1px, marcas del eje
 * redondeadas, etiquetas que se omiten cuando no caben, tooltip con ratón,
 * táctil y teclado (flechas, Inicio, Fin) y tabla oculta para lectores.
 */
export function BarChart({
  title,
  summary,
  data,
  kind = 'count',
  format,
  formatLong = format,
  formatTick = format,
  tone = 'accent',
  highlightIndex = null,
  height = 200,
  categoryHeader = 'Día',
  valueHeader = 'Valor',
  seriesLabel,
  targetLabel,
  className,
}: BarChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const [focusIdx, setFocusIdx] = useState(Math.max(0, data.length - 1))
  const items = useRef<(HTMLDivElement | null)[]>([])

  const n = data.length
  const tabIdx = Math.min(focusIdx, n - 1)
  const hasTarget = data.some((d) => d.target != null && d.target > 0)
  const twoLine = data.some((d) => d.tickSub)
  const dataMax = Math.max(0, ...data.map((d) => Math.max(d.value, d.target ?? 0)))
  const ticks = kind === 'minutes' ? niceTimeTicks(dataMax, height < 180 ? 3 : 4) : niceTicks(dataMax, height < 180 ? 3 : 4, { integer: true })
  const yMax = ticks[ticks.length - 1] || 1
  const tickText = ticks.map((t) => formatTick(t))

  const M = { top: 8, right: 2, bottom: twoLine ? 34 : 22, left: Math.ceil(Math.max(...tickText.map((t) => t.length)) * 6.2) + 12 }
  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = Math.max(0, height - M.top - M.bottom)
  const { slot, bar } = bandLayout(n, plotW)
  const y = (v: number) => M.top + plotH - (Math.max(0, v) / yMax) * plotH
  const base = M.top + plotH
  const cx = (i: number) => M.left + i * slot + slot / 2

  const labelChars = Math.max(1, ...data.map((d) => Math.max(d.tick.length, d.tickSub?.length ?? 0)))
  const shown = new Set(tickIndices(n, labelStride(n, plotW, labelChars * 6.4 + 10)))

  let targetPath = ''
  if (hasTarget && slot > 0) {
    let prev: number | null = null
    data.forEach((d, i) => {
      if (d.target == null || d.target <= 0) {
        prev = null
        return
      }
      const ty = crisp(y(d.target))
      const x0 = M.left + i * slot
      if (prev === null) targetPath += `M${x0},${ty}`
      else if (ty !== prev) targetPath += `V${ty}`
      targetPath += `H${x0 + slot}`
      prev = ty
    })
  }

  const barTop = (i: number) => {
    const v = data[i].value
    if (v <= 0) return base
    return Math.min(y(v), base - 2)
  }

  function move(to: number) {
    const next = clamp(to, 0, n - 1)
    setFocusIdx(next)
    items.current[next]?.focus()
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>, i: number) {
    const map: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }
    if (e.key in map) {
      e.preventDefault()
      move(map[e.key])
    } else if (e.key === 'Escape') {
      setActive(null)
    }
  }

  const ariaFor = (d: BarDatum) => `${d.label}: ${formatLong(d.value)}${d.note ? `, ${d.note}` : ''}`
  const tone$ = FILL[tone]

  return (
    <div className={className}>
      <ChartStyles />
      {hasTarget && targetLabel && (
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-ink-dim" aria-hidden>
          {seriesLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className={clsx('h-2 w-2 rounded-[2px]', tone === 'accent' ? 'bg-accent-fg' : 'bg-ink-dim')} />
              {seriesLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-ink-dim" />
            {targetLabel}
          </span>
        </div>
      )}

      <div
        ref={ref}
        className="relative"
        style={{ height }}
        onPointerLeave={(e: PointerEvent) => e.pointerType === 'mouse' && setActive(null)}
      >
        {width > 0 && n > 0 && (
          <>
            <svg width={width} height={height} role="img" aria-label={summary} className="block select-none overflow-visible">
              {/* Rejilla */}
              {ticks.map((t, k) => (
                <g key={t}>
                  <line
                    x1={M.left}
                    x2={width - M.right}
                    y1={crisp(y(t))}
                    y2={crisp(y(t))}
                    shapeRendering="crispEdges"
                    className={t === 0 ? 'stroke-line-strong' : 'stroke-line'}
                    strokeWidth={1}
                  />
                  <text
                    x={M.left - 8}
                    y={y(t)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-ink-faint font-mono text-[10px] [font-variant-numeric:tabular-nums]"
                  >
                    {tickText[k]}
                  </text>
                </g>
              ))}

              {/* Columna activa */}
              {active != null && (
                <rect x={M.left + active * slot + 1} y={M.top} width={Math.max(0, slot - 2)} height={plotH} rx={4} className="fill-sunken" />
              )}

              {/* Barras */}
              {data.map((d, i) => {
                if (d.value <= 0) return null
                const top = barTop(i)
                const off = highlightIndex != null && i !== highlightIndex
                return (
                  <path
                    key={d.key}
                    d={barPath(cx(i) - bar / 2, top, bar, base - top, Math.min(4, bar / 2))}
                    className={clsx('kchart-grow-y transition-[fill] duration-150', off ? tone$.off : tone$.on)}
                    style={{ animationDelay: `${Math.min(i * 14, 320)}ms` }}
                  />
                )
              })}

              {/* Meta */}
              {targetPath && (
                <path d={targetPath} fill="none" strokeWidth={1} strokeDasharray="4 3" className="stroke-ink-dim" shapeRendering="crispEdges" />
              )}

              {/* Eje X */}
              {data.map((d, i) =>
                shown.has(i) ? (
                  <text
                    key={d.key}
                    x={cx(i)}
                    y={base + 14}
                    textAnchor="middle"
                    className={clsx(
                      'font-mono text-[10px]',
                      i === active || i === highlightIndex ? 'fill-ink' : 'fill-ink-faint',
                    )}
                  >
                    {d.tick}
                    {d.tickSub && (
                      <tspan x={cx(i)} dy={12}>
                        {d.tickSub}
                      </tspan>
                    )}
                  </text>
                ) : null,
              )}
            </svg>

            {/* Capa interactiva: un objetivo por columna (más grande que la barra). */}
            <div
              role="group"
              aria-label={`${title}. Usa las flechas para recorrer los valores.`}
              className="absolute"
              style={{ left: M.left, top: M.top, width: plotW, height: plotH }}
            >
              {data.map((d, i) => (
                <div
                  key={d.key}
                  ref={(el) => {
                    items.current[i] = el
                  }}
                  role="img"
                  aria-label={ariaFor(d)}
                  tabIndex={i === tabIdx ? 0 : -1}
                  className="absolute top-0 h-full cursor-default rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fg"
                  style={{ left: i * slot, width: slot }}
                  onPointerEnter={(e) => e.pointerType !== 'touch' && setActive(i)}
                  onPointerDown={(e) => e.pointerType === 'touch' && setActive((a) => (a === i ? null : i))}
                  onFocus={() => {
                    setActive(i)
                    setFocusIdx(i)
                  }}
                  onBlur={() => setActive(null)}
                  onKeyDown={(e) => onKey(e, i)}
                />
              ))}
            </div>

            {active != null && data[active] && (
              <div
                aria-hidden
                className="pointer-events-none absolute z-10"
                style={{
                  left: clamp(cx(active), 70, width - 70),
                  top: barTop(active),
                  transform: 'translate(-50%, calc(-100% - 8px))',
                }}
              >
                <div className="animate-fade-in whitespace-nowrap rounded-control border border-line bg-raised px-2.5 py-1.5 shadow-pop">
                  <p className="font-mono text-[13px] font-semibold leading-tight text-ink">{format(data[active].value)}</p>
                  <p className="mt-0.5 text-2xs text-ink-dim">{data[active].label}</p>
                  {data[active].note && <p className="text-2xs text-ink-faint">{data[active].note}</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{categoryHeader}</th>
            <th scope="col">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>
                {formatLong(d.value)}
                {d.note ? ` (${d.note})` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
