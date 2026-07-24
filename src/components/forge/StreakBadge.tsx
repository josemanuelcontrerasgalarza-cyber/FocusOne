import { Flame } from 'lucide-react'

/**
 * Insignia de racha (días consecutivos forjando). Dorado "metal", reservado
 * exclusivamente a la racha según el sistema visual.
 *
 * En Fase 1 es presentacional: recibe `days` por prop y por defecto muestra 0.
 * TODO (Fase 5): alimentar `days` desde la tabla `streaks` de Supabase
 * (current_streak) mediante un hook con realtime o refetch post-acción.
 */
export function StreakBadge({ days = 0 }: { days?: number }) {
  const active = days > 0
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-forge-line bg-forge-surface px-3 py-1.5"
      title={`Racha: ${days} ${days === 1 ? 'día' : 'días'}`}
      aria-label={`Racha de ${days} días`}
    >
      <Flame
        size={16}
        className={active ? 'text-metal' : 'text-forge-ink-faint'}
        strokeWidth={2.4}
      />
      <span
        className={`font-num text-sm tabular-nums ${active ? 'text-metal' : 'text-forge-ink-faint'}`}
      >
        {days}
      </span>
    </div>
  )
}
