import 'server-only'

/**
 * La racha solo se recalcula en `handle_mission_streak()` cuando el usuario
 * completa una misión: si abandona la app, `profiles.streak_current` se queda
 * congelado en su último valor para siempre, en vez de mostrar 0. Esta función
 * corrige la LECTURA: si `streak_last_date` no es hoy ni ayer (en la fecha del
 * servidor, la misma referencia que usa el trigger para decidir si continúa o
 * reinicia), la racha se muestra rota aunque la columna todavía no se haya
 * actualizado. No escribe en la base de datos — la próxima misión completada
 * la vuelve a poner en 1 vía el trigger, como siempre.
 */
export function effectiveStreak(
  streakCurrent: number | null | undefined,
  streakLastDate: string | null | undefined,
): number {
  if (!streakLastDate) return 0

  const [y, m, d] = streakLastDate.split('-').map(Number)
  const lastUTC = Date.UTC(y, (m ?? 1) - 1, d ?? 1)

  const now = new Date()
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

  const diffDays = Math.round((todayUTC - lastUTC) / (24 * 60 * 60 * 1000))
  return diffDays <= 1 ? (streakCurrent ?? 0) : 0
}
