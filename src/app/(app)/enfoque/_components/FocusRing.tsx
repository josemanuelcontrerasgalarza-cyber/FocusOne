import type { ReactNode } from 'react'
import clsx from 'clsx'

const SIZE = 320
const C = SIZE / 2
const R = 148
const CIRC = 2 * Math.PI * R

/**
 * Anillo de progreso del modo Enfoque. Eco de la marca: un anillo de tiempo
 * con un punto lima en la cabeza del progreso. Escala con su contenedor.
 */
export function FocusRing({
  progress,
  tone = 'focus',
  head = true,
  timing = '300ms linear',
  className,
  children,
}: {
  progress: number
  tone?: 'focus' | 'break'
  head?: boolean
  /** duración y curva de la transición entre valores */
  timing?: string
  className?: string
  children?: ReactNode
}) {
  const p = Math.max(0, Math.min(1, progress))
  const transition = `stroke-dashoffset ${timing}, transform ${timing}`
  return (
    <div className={clsx('relative aspect-square', className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx={C} cy={C} r={R} fill="none" strokeWidth={2} className="stroke-line" />
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeOpacity={p > 0.001 ? 1 : 0}
          className={tone === 'focus' ? 'stroke-accent-fg' : 'stroke-ink-dim'}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - p)}
          style={{ transition }}
        />
        {head && (
          <g style={{ transform: `rotate(${p * 360}deg)`, transformOrigin: `${C}px ${C}px`, transition }}>
            <circle cx={C + R} cy={C} r={9} className="fill-canvas" />
            <circle cx={C + R} cy={C} r={6} fill={tone === 'focus' ? 'rgb(var(--accent))' : 'rgb(var(--ink-dim))'} />
          </g>
        )}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  )
}
