/**
 * Ayudas puras de la vista de Estadísticas (periodos, agregación semanal,
 * días activos, formato). Sin React: se prueban con `node --test`.
 */
import { addDays, fromDateKey, MONTHS_SHORT, startOfWeek, WEEKDAYS_LONG, WEEKDAYS_SHORT } from '../../../../lib/kairo/dates.ts'
import { dayOf, sessionMinutes, type DayPoint } from '../../../../lib/kairo/stats.ts'
import type { FocusSession, Task } from '../../../../lib/kairo/types.ts'

export type RangeKey = '7' | '30' | '90'
export const RANGES: { value: RangeKey; label: string; days: number }[] = [
  { value: '7', label: '7 días', days: 7 },
  { value: '30', label: '30 días', days: 30 },
  { value: '90', label: '90 días', days: 90 },
]
export const isRangeKey = (v: unknown): v is RangeKey => v === '7' || v === '30' || v === '90'

/** Los `days.length` días inmediatamente anteriores al periodo (para comparar). */
export function previousDays(days: string[]): string[] {
  if (!days.length) return []
  const n = days.length
  return Array.from({ length: n }, (_, i) => addDays(days[0], i - n))
}

export interface WeekBucket {
  /** Lunes de la semana. */
  start: string
  /** Días de la semana que caen dentro del periodo (la primera y la última pueden ser parciales). */
  days: string[]
  value: number
}

/** Agrupa una serie diaria en semanas de lunes a domingo. */
export function weekBuckets(points: DayPoint[]): WeekBucket[] {
  const out: WeekBucket[] = []
  for (const p of points) {
    const start = startOfWeek(p.day)
    const last = out[out.length - 1]
    if (last && last.start === start) {
      last.days.push(p.day)
      last.value += p.value
    } else {
      out.push({ start, days: [p.day], value: p.value })
    }
  }
  return out
}

/** Días con actividad real: una tarea completada o más de 0 minutos de enfoque. */
export function activityDays(sessions: FocusSession[], tasks: Task[]): Set<string> {
  const set = new Set<string>()
  for (const s of sessions) if (sessionMinutes(s) > 0) set.add(dayOf(s.started_at))
  for (const t of tasks) if (t.status === 'completed' && t.completed_at) set.add(dayOf(t.completed_at))
  return set
}

/** Reordena un array indexado por getDay() (0 = domingo) para empezar en lunes. */
export function mondayFirst<T>(byWeekday: T[]): T[] {
  return [1, 2, 3, 4, 5, 6, 0].map((i) => byWeekday[i])
}
export const WEEKDAYS_MON_SHORT = mondayFirst(WEEKDAYS_SHORT)
export const WEEKDAYS_MON_LONG = mondayFirst(WEEKDAYS_LONG)

/** Índice del mayor valor positivo (el primero en caso de empate); null si todo es 0. */
export function argMax(values: number[]): number | null {
  let best: number | null = null
  values.forEach((v, i) => {
    if (v > 0 && (best === null || v > values[best])) best = i
  })
  return best
}

/**
 * Tareas para `byProject` acotadas a un periodo: las completadas fuera del
 * periodo se tratan como no completadas (siguen sirviendo para asociar
 * sesiones a su proyecto).
 */
export function tasksForPeriod(tasks: Task[], days: Set<string>): Task[] {
  return tasks.map((t) =>
    t.status === 'completed' && (!t.completed_at || !days.has(dayOf(t.completed_at))) ? { ...t, status: 'pending' as const } : t,
  )
}

/* ───────────── Formato ───────────── */

const NBSP = ' '

/** "lun 12 oct" */
export function dayLabel(key: string): string {
  const d = fromDateKey(key)
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** "12 oct" */
export function shortDate(key: string): string {
  const d = fromDateKey(key)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** 0.42 → "42 %" */
export function formatPct(ratio: number): string {
  return `${Math.round(ratio * 100)}${NBSP}%`
}

/** Variación relativa → "+12 %", "−8 %", "0 %". */
export function formatDelta(d: number): string {
  const p = Math.round(d * 100)
  if (p === 0) return `0${NBSP}%`
  return `${p > 0 ? '+' : '−'}${Math.abs(p)}${NBSP}%`
}

/** Plural sencillo: plural(1, 'tarea') → "1 tarea"; plural(3, 'tarea') → "3 tareas". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}
