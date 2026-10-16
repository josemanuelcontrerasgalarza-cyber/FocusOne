/**
 * Utilidades de presentación del módulo Objetivos y hábitos. Solo formato y
 * derivaciones de datos reales; la lógica de dominio vive en `lib/kairo`.
 */
import {
  addDays,
  diffDays,
  fromDateKey,
  MONTHS_SHORT,
  range,
  startOfWeek,
  toDateKey,
} from '@/lib/kairo/dates'
import { bestDailyStreak, habitStreak } from '@/lib/kairo/streaks'
import type { Goal, Habit, Task } from '@/lib/kairo/types'
import type { Progress } from '@/lib/kairo/tasks'

const nf = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })

export const fmtNum = (n: number) => nf.format(n)

export const todayKey = () => toDateKey(new Date())

export const isoToKey = (iso: string) => toDateKey(new Date(iso))

/** "1 día" / "3 días". */
export function plural(n: number, one: string, many: string): string {
  return `${fmtNum(n)} ${n === 1 ? one : many}`
}

/** "28 oct" (o "28 oct 2027" si cambia el año). */
export function shortDate(key: string, today: string): string {
  const d = fromDateKey(key)
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
  return d.getFullYear() !== fromDateKey(today).getFullYear() ? `${base} ${d.getFullYear()}` : base
}

/** "12 oct 2026" siempre con año (historial). */
export function longDate(key: string): string {
  const d = fromDateKey(key)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** Parsea números escritos con coma o punto decimal. NaN si no es válido. */
export function parseNum(raw: string): number {
  const clean = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!clean) return NaN
  return Number(clean)
}

/* ───────────────────────── Objetivos ───────────────────────── */

export interface DueInfo {
  label: string
  tone: 'neutral' | 'warm' | 'danger'
}

/** Cuenta atrás hasta la fecha objetivo. */
export function dueInfo(due: string, today: string): DueInfo {
  const d = diffDays(today, due)
  if (d < 0) return { label: 'Vencido', tone: 'danger' }
  if (d === 0) return { label: 'Vence hoy', tone: 'warm' }
  if (d === 1) return { label: 'Vence mañana', tone: 'warm' }
  return { label: `Faltan ${d} días`, tone: d <= 7 ? 'warm' : 'neutral' }
}

export const isMeasurable = (g: Goal) => Boolean(g.target_value)

/** "3 / 12 libros" o "4 de 7 tareas". */
export function progressLabel(goal: Goal, p: Progress): string {
  if (isMeasurable(goal)) {
    const unit = goal.unit ? ` ${goal.unit}` : ''
    return `${fmtNum(goal.current_value)} / ${fmtNum(goal.target_value as number)}${unit}`
  }
  if (p.total === 0) return 'Sin tareas vinculadas'
  return `${p.done} de ${plural(p.total, 'tarea', 'tareas')}`
}

/** Resultado final de un objetivo cumplido (historial). */
export function achievedResult(goal: Goal, tasks: Task[]): string | null {
  if (isMeasurable(goal)) {
    return `${fmtNum(goal.current_value)}${goal.unit ? ` ${goal.unit}` : ''}`
  }
  const n = tasks.filter((t) => t.goal_id === goal.id && !t.parent_id && t.status === 'completed').length
  return n ? plural(n, 'tarea', 'tareas') : null
}

export const linkedTaskCount = (goalId: string, tasks: Task[]) =>
  tasks.filter((t) => t.goal_id === goalId && !t.parent_id).length

/* ───────────────────────── Hábitos ───────────────────────── */

export const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

export interface HabitStats {
  week: string[]
  weekDone: number
  doneToday: boolean
  streak: { value: number; unit: 'días' | 'semanas' }
  best: number
  last30: string[]
  done30: number
  /** 0..1 respecto a la meta semanal, en una ventana justa (no cuenta días antes de empezar). */
  rate30: number
}

export function habitStats(habit: Habit, dates: string[], today: string): HabitStats {
  const set = new Set(dates)
  const week = range(startOfWeek(today), 7)
  const last30 = range(addDays(today, -29), 30)
  const done30 = last30.filter((d) => set.has(d)).length
  // Ventana justa: desde que empezó el hábito (o su primer registro), máx. 30 días.
  const first = [isoToKey(habit.created_at), ...dates].sort()[0]
  const windowDays = Math.max(1, Math.min(30, diffDays(first, today) + 1))
  const target = Math.max(1, Math.min(7, habit.target_per_week))
  const expected = Math.max(1, (windowDays * target) / 7)
  return {
    week,
    weekDone: week.filter((d) => set.has(d)).length,
    doneToday: set.has(today),
    streak: habitStreak(set, target, today),
    best: bestDailyStreak(set),
    last30,
    done30,
    rate30: Math.min(1, done30 / expected),
  }
}

export const HABIT_ICONS = [
  '💧', '📚', '🏃', '🧘', '💪', '🥗', '😴', '✍️',
  '🧠', '🌱', '🚶', '🎸', '🦷', '💊', '☀️', '📵',
] as const
