/**
 * Estadísticas a partir de datos REALES (sesiones y tareas). Funciones puras:
 * sin datos devuelven ceros, nunca valores inventados.
 */
import { addDays, range, toDateKey } from './dates.ts'
import type { FocusSession, Project, Task } from './types.ts'

/** Minutos realmente enfocados en una sesión. */
export function sessionMinutes(s: FocusSession): number {
  if (s.actual_seconds != null) return s.actual_seconds / 60
  if (s.completed) return s.planned_minutes
  if (!s.ended_at) return 0
  const el = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
  return Math.max(0, Math.min(el, s.planned_minutes))
}

export const dayOf = (iso: string) => toDateKey(new Date(iso))

export interface DayPoint {
  day: string
  value: number
}

export function focusByDay(sessions: FocusSession[], days: string[]): DayPoint[] {
  const map = new Map(days.map((d) => [d, 0]))
  for (const s of sessions) {
    const d = dayOf(s.started_at)
    if (map.has(d)) map.set(d, (map.get(d) ?? 0) + sessionMinutes(s))
  }
  return days.map((d) => ({ day: d, value: Math.round(map.get(d) ?? 0) }))
}

export function tasksDoneByDay(tasks: Task[], days: string[]): DayPoint[] {
  const map = new Map(days.map((d) => [d, 0]))
  for (const t of tasks) {
    if (t.status !== 'completed' || !t.completed_at) continue
    const d = dayOf(t.completed_at)
    if (map.has(d)) map.set(d, (map.get(d) ?? 0) + 1)
  }
  return days.map((d) => ({ day: d, value: map.get(d) ?? 0 }))
}

export function lastDays(today: string, n: number): string[] {
  return range(addDays(today, -(n - 1)), n)
}

export interface PeriodSummary {
  focusMinutes: number
  sessions: number
  completedSessions: number
  tasksDone: number
  activeDays: number
}

export function summarize(sessions: FocusSession[], tasks: Task[], days: string[]): PeriodSummary {
  const set = new Set(days)
  const inRange = sessions.filter((s) => set.has(dayOf(s.started_at)))
  const done = tasks.filter((t) => t.status === 'completed' && t.completed_at && set.has(dayOf(t.completed_at)))
  const active = new Set<string>()
  for (const s of inRange) if (sessionMinutes(s) > 0) active.add(dayOf(s.started_at))
  for (const t of done) active.add(dayOf(t.completed_at as string))
  return {
    focusMinutes: Math.round(inRange.reduce((a, s) => a + sessionMinutes(s), 0)),
    // Una sesión descartada se cierra con 0 s: no cuenta como sesión.
    sessions: inRange.filter((s) => s.completed || sessionMinutes(s) > 0).length,
    completedSessions: inRange.filter((s) => s.completed).length,
    tasksDone: done.length,
    activeDays: active.size,
  }
}

/** Variación relativa entre periodos (null si no hay base de comparación). */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / previous
}

/** Minutos de enfoque por día de la semana (0=dom). */
export function focusByWeekday(sessions: FocusSession[]): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0]
  for (const s of sessions) out[new Date(s.started_at).getDay()] += sessionMinutes(s)
  return out.map(Math.round)
}

/** Distribución del enfoque por franja horaria. */
export function focusByDaypart(sessions: FocusSession[]): { label: string; minutes: number }[] {
  const parts = [
    { label: 'Madrugada', from: 0, to: 6, minutes: 0 },
    { label: 'Mañana', from: 6, to: 12, minutes: 0 },
    { label: 'Tarde', from: 12, to: 19, minutes: 0 },
    { label: 'Noche', from: 19, to: 24, minutes: 0 },
  ]
  for (const s of sessions) {
    const h = new Date(s.started_at).getHours()
    const p = parts.find((x) => h >= x.from && h < x.to)
    if (p) p.minutes += sessionMinutes(s)
  }
  return parts.map(({ label, minutes }) => ({ label, minutes: Math.round(minutes) }))
}

/** Enfoque y tareas completadas por proyecto (vía task_id → project_id). */
export function byProject(
  sessions: FocusSession[],
  tasks: Task[],
  projects: Project[],
): { id: string | null; name: string; color: string; minutes: number; tasksDone: number }[] {
  const taskProject = new Map(tasks.map((t) => [t.id, t.project_id]))
  const rows = new Map<string | null, { minutes: number; tasksDone: number }>()
  const bump = (id: string | null, minutes: number, done: number) => {
    const r = rows.get(id) ?? { minutes: 0, tasksDone: 0 }
    r.minutes += minutes
    r.tasksDone += done
    rows.set(id, r)
  }
  for (const s of sessions) bump(s.task_id ? taskProject.get(s.task_id) ?? null : null, sessionMinutes(s), 0)
  for (const t of tasks) if (t.status === 'completed' && !t.parent_id) bump(t.project_id, 0, 1)
  return [...rows.entries()]
    .map(([id, r]) => {
      const p = projects.find((x) => x.id === id)
      return { id, name: p?.name ?? 'Sin proyecto', color: p?.color ?? 'slate', minutes: Math.round(r.minutes), tasksDone: r.tasksDone }
    })
    .filter((r) => r.minutes > 0 || r.tasksDone > 0)
    .sort((a, b) => b.minutes - a.minutes || b.tasksDone - a.tasksDone)
}
