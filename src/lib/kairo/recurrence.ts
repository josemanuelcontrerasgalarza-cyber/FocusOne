/** Recurrencia de tareas: calcula la siguiente ocurrencia (fechas locales). */
import { addDays, addMonths, weekday } from './dates.ts'
import type { Recurrence } from './types.ts'

function step(key: string, rec: Recurrence): string {
  switch (rec) {
    case 'daily':
      return addDays(key, 1)
    case 'weekly':
      return addDays(key, 7)
    case 'monthly':
      return addMonths(key, 1)
    case 'weekdays': {
      let next = addDays(key, 1)
      while (weekday(next) === 0 || weekday(next) === 6) next = addDays(next, 1)
      return next
    }
  }
}

/**
 * Siguiente fecha tras completar una tarea recurrente. Parte de la fecha
 * prevista (o de hoy) y avanza hasta quedar en el futuro, para que completar
 * tarde una tarea diaria no genere ocurrencias ya vencidas.
 */
export function nextOccurrence(baseKey: string | null, rec: Recurrence, today: string): string {
  const base = baseKey ?? today
  let next = step(base, rec)
  let guard = 0
  while (next <= today && guard++ < 1000) next = step(next, rec)
  return next
}

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  daily: 'Cada día',
  weekdays: 'Entre semana',
  weekly: 'Cada semana',
  monthly: 'Cada mes',
}
