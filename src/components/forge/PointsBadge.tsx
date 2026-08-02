import { Gem } from 'lucide-react'

/**
 * Insignia de puntos totales del usuario (Fase 5). Estilo neutro (no usa el
 * ember de la misión ni el metal de la racha). El total lo mantiene el trigger
 * del quiz en points.total_points; el layout lo lee por request.
 */
export function PointsBadge({ points = 0 }: { points?: number }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-forge-line bg-forge-surface px-3 py-1.5"
      title={`${points} puntos`}
      aria-label={`${points} puntos`}
    >
      <Gem size={14} className="text-forge-ink-dim" strokeWidth={2.2} />
      <span className="font-num text-[13px] font-semibold tabular-nums text-forge-ink">
        {points}
      </span>
    </div>
  )
}
