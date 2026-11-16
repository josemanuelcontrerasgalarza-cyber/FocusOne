/**
 * «Ahora no»: tareas apartadas de «Tu siguiente movimiento» SOLO por hoy.
 * Mirar una tarea que no puedes encarar ahora bloquea; apartarla y recibir
 * otra opción concreta reduce la fricción para empezar. Al cambiar el día
 * (fecha local) la lista se vacía sola: nada queda escondido para siempre.
 */
export interface SkipState {
  /** fecha local YYYY-MM-DD a la que pertenecen los ids */
  date: string
  ids: string[]
}

const MAX_SKIPS = 200

/** Ids apartados vigentes para `today` (vacío si la lista es de otro día o no es válida). */
export function activeSkips(state: unknown, today: string): string[] {
  if (!state || typeof state !== 'object') return []
  const s = state as Partial<SkipState>
  if (s.date !== today || !Array.isArray(s.ids)) return []
  return s.ids.filter((x): x is string => typeof x === 'string').slice(-MAX_SKIPS)
}

export function addSkip(state: unknown, id: string, today: string): SkipState {
  const ids = activeSkips(state, today).filter((x) => x !== id)
  ids.push(id)
  return { date: today, ids: ids.slice(-MAX_SKIPS) }
}

export function removeSkip(state: unknown, id: string, today: string): SkipState {
  return { date: today, ids: activeSkips(state, today).filter((x) => x !== id) }
}
