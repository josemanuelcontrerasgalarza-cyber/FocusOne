import { Gem } from 'lucide-react'
import { INFINITE } from '@/lib/developer'

/**
 * Insignia de puntos totales del usuario (Fase 5). Estilo neutro (no usa el
 * ember de la misión ni el metal de la racha). El total lo mantiene el trigger
 * del quiz en points.total_points; el layout lo lee por request. Las cuentas
 * developer muestran ∞ (diamantes ilimitados) con acento ember.
 */
export function PointsBadge({
  points = 0,
  isDeveloper = false,
}: {
  points?: number
  isDeveloper?: boolean
}) {
  const label = isDeveloper ? INFINITE : String(points)
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
        isDeveloper ? 'border-ember/40 bg-ember/10' : 'border-forge-line bg-forge-surface'
      }`}
      title={isDeveloper ? 'Diamantes ilimitados (developer)' : `${points} puntos`}
      aria-label={isDeveloper ? 'Diamantes ilimitados' : `${points} puntos`}
    >
      <Gem
        size={14}
        className={isDeveloper ? 'text-ember' : 'text-forge-ink-dim'}
        strokeWidth={2.2}
      />
      <span
        className={`font-num text-[13px] font-semibold tabular-nums ${
          isDeveloper ? 'text-ember' : 'text-forge-ink'
        }`}
      >
        {label}
      </span>
    </div>
  )
}
