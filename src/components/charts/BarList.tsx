import type { ReactNode } from 'react'
import clsx from 'clsx'
import { ChartStyles } from './ChartStyles'

export interface BarListItem {
  key: string
  label: ReactNode
  value: number
  /** Valor ya formateado, rotulado a la derecha ("1h 20m"). */
  display: string
  /** Dato secundario a la derecha, en tono tenue ("42 %", "3 tareas"). */
  secondary?: string
  /** Color de identidad (hex) para el punto y la barra; si no, el acento. */
  color?: string
  /** Atenúa la barra (cuando otra fila es la protagonista). */
  muted?: boolean
}

/**
 * Barras horizontales rotuladas (HTML puro). Cada fila lleva su valor escrito,
 * así que el gráfico se lee sin tooltip y es una lista accesible tal cual.
 */
export function BarList({
  items,
  max,
  label,
  className,
}: {
  items: BarListItem[]
  /** Valor que llena la barra entera (por defecto, el mayor). */
  max?: number
  /** Nombre accesible de la lista. */
  label: string
  className?: string
}) {
  const top = max ?? Math.max(0, ...items.map((i) => i.value))
  return (
    <ul aria-label={label} className={clsx('flex flex-col gap-3', className)}>
      <ChartStyles />
      {items.map((it, k) => {
        const pct = top > 0 ? Math.max(0, Math.min(1, it.value / top)) : 0
        return (
          <li key={it.key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2 text-ink">
                {it.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: it.color }} aria-hidden />}
                <span className="truncate">{it.label}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2 font-mono tabular-nums">
                <span className="text-ink">{it.display}</span>
                {it.secondary && <span className="min-w-[3.25rem] text-right text-2xs text-ink-faint">{it.secondary}</span>}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
              {pct > 0 && (
                <div
                  className={clsx('kchart-grow-x h-full rounded-full', !it.color && (it.muted ? 'bg-accent-fg/35' : 'bg-accent-fg'))}
                  style={{
                    width: `${Math.max(pct * 100, 1.5)}%`,
                    backgroundColor: it.color,
                    opacity: it.color && it.muted ? 0.45 : undefined,
                    animationDelay: `${Math.min(k * 40, 240)}ms`,
                  }}
                />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
