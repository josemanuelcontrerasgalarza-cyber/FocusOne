/** Rachas de hábitos y de actividad. Motivan sin castigar: el día de hoy aún no rompe la racha. */
import { addDays, startOfWeek, range } from './dates.ts'

/**
 * Racha diaria: días consecutivos con registro que terminan hoy (o ayer, si
 * hoy todavía no se ha registrado — el día no ha terminado).
 */
export function dailyStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates)
  let cursor = set.has(today) ? today : addDays(today, -1)
  let n = 0
  while (set.has(cursor)) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

/** Mejor racha diaria histórica. */
export function bestDailyStreak(dates: Iterable<string>): number {
  const sorted = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** Registros dentro de la semana (lunes-domingo) que contiene `day`. */
export function weekCount(dates: Iterable<string>, day: string): number {
  const start = startOfWeek(day)
  const week = new Set(range(start, 7))
  let n = 0
  for (const d of new Set(dates)) if (week.has(d)) n++
  return n
}

/**
 * Racha semanal para hábitos con objetivo < 7 días/semana: semanas
 * consecutivas cumpliendo el objetivo. La semana actual suma si ya se cumplió,
 * pero no la rompe si aún está en curso.
 */
export function weeklyStreak(dates: Iterable<string>, target: number, today: string): number {
  const list = [...new Set(dates)]
  let weekStart = startOfWeek(today)
  let n = weekCount(list, weekStart) >= target ? 1 : 0
  weekStart = addDays(weekStart, -7)
  while (weekCount(list, weekStart) >= target) {
    n++
    weekStart = addDays(weekStart, -7)
  }
  return n
}

/** Racha adecuada al tipo de hábito. */
export function habitStreak(dates: Iterable<string>, targetPerWeek: number, today: string): { value: number; unit: 'días' | 'semanas' } {
  return targetPerWeek >= 7
    ? { value: dailyStreak(dates, today), unit: 'días' }
    : { value: weeklyStreak(dates, targetPerWeek, today), unit: 'semanas' }
}
