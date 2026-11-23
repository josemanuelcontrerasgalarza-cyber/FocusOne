/**
 * «Ahora no»: tareas que el usuario apartó de «Tu siguiente movimiento» por
 * hoy. Es una decisión del momento, no un ajuste: vive en el navegador y se
 * olvida sola al cambiar de día (mañana todo vuelve a contar).
 */
export interface SkipState {
  day: string
  ids: string[]
}

/** Máximo de tareas apartadas a la vez (evita que el valor guardado crezca sin control). */
export const MAX_SKIPS = 50

/** Normaliza lo guardado: solo cuenta si es de hoy y tiene forma válida. */
export function readSkips(raw: unknown, today: string): string[] {
  if (!raw || typeof raw !== 'object') return []
  const s = raw as Partial<SkipState>
  if (s.day !== today || !Array.isArray(s.ids)) return []
  const ids = s.ids.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 64)
  return [...new Set(ids)].slice(-MAX_SKIPS)
}

export function addSkip(ids: readonly string[], id: string, today: string): SkipState {
  const next = ids.filter((x) => x !== id)
  next.push(id)
  return { day: today, ids: next.slice(-MAX_SKIPS) }
}

export function removeSkip(ids: readonly string[], id: string, today: string): SkipState {
  return { day: today, ids: ids.filter((x) => x !== id) }
}
