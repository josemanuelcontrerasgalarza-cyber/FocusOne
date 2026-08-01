/**
 * Insignia de racha (días consecutivos forjando). Dorado "metal", reservado
 * exclusivamente a la racha según el sistema visual. Coincide con el mockup:
 * píldora con punto metal + "N días".
 *
 * La racha la calcula el servidor (layout la lee de `profiles.streak_current`).
 * TODO (Fase 5): mover a su propia tabla `streaks` con lógica dedicada.
 */
export function StreakBadge({ days = 0 }: { days?: number }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-metal/25 bg-metal/10 px-3.5 py-1.5"
      title={`Racha: ${days} ${days === 1 ? 'día' : 'días'}`}
      aria-label={`Racha de ${days} días`}
    >
      <span className="h-1.5 w-1.5 rounded-[1px] bg-metal" />
      <span className="font-num text-[13px] font-semibold tabular-nums text-metal">
        {days} {days === 1 ? 'día' : 'días'}
      </span>
    </div>
  )
}
