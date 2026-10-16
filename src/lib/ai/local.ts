/**
 * Funciones del asistente que se calculan EN EL DISPOSITIVO, sin IA: siguiente
 * movimiento, tareas vencidas y un plan del día sencillo. Módulo puro.
 */
import { diffDays } from '../kairo/dates.ts'
import { nowContext, rankTasks } from '../kairo/priority.ts'
import { dueBucket } from '../kairo/tasks.ts'
import type { Project, Task } from '../kairo/types.ts'
import type { Plan, PlanBlock } from './types.ts'

export interface LocalMove {
  taskId: string
  title: string
  parentTitle?: string
  reasons: string[]
}

export interface LocalNext {
  move: LocalMove | null
  after: LocalMove[]
}

export function localNextMove(tasks: Task[], projects: Project[], now = new Date()): LocalNext {
  const ranked = rankTasks(tasks, nowContext(now, projects))
  const toMove = (s: (typeof ranked)[number]): LocalMove => ({
    taskId: s.task.id,
    title: s.task.title,
    parentTitle: s.parent?.title,
    reasons: s.reasons.length ? s.reasons.slice(0, 4) : ['Es lo siguiente en tu lista'],
  })
  return { move: ranked[0] ? toMove(ranked[0]) : null, after: ranked.slice(1, 3).map(toMove) }
}

export interface OverdueItem {
  taskId: string
  title: string
  due: string
  daysLate: number
}

export function overdueTasks(tasks: Task[], today: string): OverdueItem[] {
  return tasks
    .filter((t) => t.status !== 'completed' && dueBucket(t, today) === 'overdue')
    .map((t) => ({ taskId: t.id, title: t.title, due: t.due_date as string, daysLate: -diffDays(today, t.due_date as string) }))
    .sort((a, b) => b.daysLate - a.daysLate || a.title.localeCompare(b.title, 'es'))
}

/**
 * Plan del día sin IA: recorre el ranking local y llena el objetivo diario de
 * enfoque (o 2 h si no hay). Tareas sin estimación usan la duración de un
 * bloque de enfoque.
 */
export function localPlan(
  tasks: Task[],
  projects: Project[],
  opts: { dailyGoalMinutes: number; blockMinutes: number; now?: Date },
): Plan {
  const ranked = rankTasks(tasks, nowContext(opts.now ?? new Date(), projects))
  const budget = opts.dailyGoalMinutes > 0 ? opts.dailyGoalMinutes : 120
  const block = opts.blockMinutes > 0 ? opts.blockMinutes : 25
  const blocks: PlanBlock[] = []
  const seen = new Set<string>()
  let total = 0
  for (const s of ranked) {
    const parent = s.parent && s.parent.status !== 'completed' ? s.parent : null
    const subject = parent ?? s.task
    if (seen.has(subject.id)) continue
    seen.add(subject.id)
    const minutes = s.task.estimated_minutes ?? subject.estimated_minutes ?? block
    if (blocks.length && total + minutes > budget * 1.15) continue
    blocks.push({
      taskId: subject.id,
      title: subject.title,
      minutes,
      why: parent ? `Siguiente paso: ${s.task.title}` : (s.reasons[0] ?? 'Siguiente en tu lista por prioridad'),
    })
    total += minutes
    if (total >= budget || blocks.length >= 6) break
  }
  const summary = blocks.length
    ? `Propuesta según prioridad y vencimientos para unos ${total} min de trabajo (objetivo diario: ${budget} min). Los tiempos sin estimación usan bloques de ${block} min.`
    : 'No tienes tareas abiertas. Captura la primera para poder planificar.'
  return { summary, blocks }
}
