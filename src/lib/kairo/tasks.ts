/** Utilidades de tareas: buckets de vencimiento, filtros, orden, búsqueda y progreso. */
import { diffDays } from './dates.ts'
import type { Goal, Priority, Task } from './types.ts'

export type DueBucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none'

export function dueBucket(task: Pick<Task, 'due_date'>, today: string): DueBucket {
  if (!task.due_date) return 'none'
  const d = diffDays(today, task.due_date)
  if (d < 0) return 'overdue'
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d <= 7) return 'week'
  return 'later'
}

export const isOpen = (t: Task) => t.status !== 'completed'
export const isOverdue = (t: Task, today: string) => isOpen(t) && dueBucket(t, today) === 'overdue'

const strip = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Búsqueda insensible a mayúsculas y tildes en título, descripción y etiquetas. */
export function matchesQuery(t: Task, q: string): boolean {
  const needle = strip(q.trim())
  if (!needle) return true
  return needle
    .split(/\s+/)
    .every((part) => strip(`${t.title} ${t.description ?? ''} ${t.tags.join(' ')}`).includes(part))
}

export interface TaskFilters {
  status?: 'open' | 'done' | 'all'
  priorities?: Priority[]
  projectId?: string | 'none' | null
  tag?: string | null
  due?: 'overdue' | 'today' | 'week' | 'none' | null
  query?: string
  /** incluir subtareas como filas independientes */
  includeSubtasks?: boolean
}

export function filterTasks(tasks: Task[], f: TaskFilters, today: string): Task[] {
  return tasks.filter((t) => {
    if (!f.includeSubtasks && t.parent_id) return false
    if (f.status === 'open' && !isOpen(t)) return false
    if (f.status === 'done' && isOpen(t)) return false
    if (f.priorities?.length && !f.priorities.includes(t.priority)) return false
    if (f.projectId === 'none' && t.project_id) return false
    if (f.projectId && f.projectId !== 'none' && t.project_id !== f.projectId) return false
    if (f.tag && !t.tags.includes(f.tag)) return false
    if (f.due) {
      const b = dueBucket(t, today)
      if (f.due === 'overdue' && b !== 'overdue') return false
      if (f.due === 'today' && b !== 'today' && b !== 'overdue') return false
      if (f.due === 'week' && !['overdue', 'today', 'tomorrow', 'week'].includes(b)) return false
      if (f.due === 'none' && b !== 'none') return false
    }
    if (f.query && !matchesQuery(t, f.query)) return false
    return true
  })
}

export type TaskSort = 'due' | 'priority' | 'created' | 'title'

const dueKey = (t: Task) => `${t.due_date ?? '9999-12-31'} ${t.due_time ?? '99:99'}`

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const arr = [...tasks]
  const done = (t: Task) => (t.status === 'completed' ? 1 : 0)
  switch (sort) {
    case 'due':
      return arr.sort((a, b) => done(a) - done(b) || dueKey(a).localeCompare(dueKey(b)) || b.priority - a.priority)
    case 'priority':
      return arr.sort((a, b) => done(a) - done(b) || b.priority - a.priority || dueKey(a).localeCompare(dueKey(b)))
    case 'created':
      return arr.sort((a, b) => done(a) - done(b) || b.created_at.localeCompare(a.created_at))
    case 'title':
      return arr.sort((a, b) => done(a) - done(b) || a.title.localeCompare(b.title, 'es'))
  }
}

export function subtasksOf(tasks: Task[], parentId: string): Task[] {
  return tasks
    .filter((t) => t.parent_id === parentId)
    .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.created_at.localeCompare(b.created_at))
}

export interface Progress {
  done: number
  total: number
  ratio: number
}

const ratio = (done: number, total: number): Progress => ({ done, total, ratio: total ? done / total : 0 })

/** Progreso de un proyecto: tareas de primer nivel completadas / totales. */
export function projectProgress(projectId: string, tasks: Task[]): Progress {
  const own = tasks.filter((t) => t.project_id === projectId && !t.parent_id)
  return ratio(own.filter((t) => t.status === 'completed').length, own.length)
}

/** Progreso de un objetivo: valor/meta si es medible; si no, tareas vinculadas. */
export function goalProgress(goal: Goal, tasks: Task[]): Progress {
  if (goal.target_value) return ratio(Math.min(goal.current_value, goal.target_value), goal.target_value)
  const linked = tasks.filter((t) => t.goal_id === goal.id && !t.parent_id)
  return ratio(linked.filter((t) => t.status === 'completed').length, linked.length)
}

export function allTags(tasks: Task[]): string[] {
  const set = new Set<string>()
  for (const t of tasks) for (const tag of t.tags) set.add(tag)
  return [...set].sort((a, b) => a.localeCompare(b, 'es'))
}

export const PRIORITY_META: Record<Priority, { label: string; short: string }> = {
  1: { label: 'Baja', short: 'P4' },
  2: { label: 'Media', short: 'P3' },
  3: { label: 'Alta', short: 'P2' },
  4: { label: 'Urgente', short: 'P1' },
}
