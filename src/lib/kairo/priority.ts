/**
 * "Tu siguiente movimiento": priorización EXPLICABLE de tareas con reglas
 * simples sobre datos reales (vencimiento, prioridad, estado, antigüedad,
 * proyecto). Devuelve la tarea recomendada y los motivos en lenguaje humano.
 */
import { diffDays, shortTime, toDateKey } from './dates.ts'
import type { Project, Task } from './types.ts'

export interface MoveContext {
  today: string
  /** 'HH:MM' local actual, para "vence en 2 h" */
  nowTime?: string
  projects?: Project[]
}

export interface Scored {
  task: Task
  parent: Task | null
  score: number
  reasons: string[]
}

const PRIORITY_LABEL = { 1: 'baja', 2: 'media', 3: 'alta', 4: 'urgente' } as const

function minutesOfDay(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function scoreTask(task: Task, ctx: MoveContext, parent: Task | null = null): Scored {
  let score = 0
  const reasons: { w: number; text: string }[] = []
  const add = (w: number, text?: string) => {
    score += w
    if (text) reasons.push({ w, text })
  }
  // La urgencia de la tarea padre se hereda en sus subtareas.
  const due = task.due_date ?? parent?.due_date ?? null
  const dueTime = task.due_date ? task.due_time : parent?.due_time ?? null
  const priority = Math.max(task.priority, parent?.priority ?? 1) as Task['priority']

  if (task.status === 'active') add(1000, 'Ya la tienes en curso: termínala')
  else if (task.status === 'in_progress') add(60, 'Está en curso')

  if (due) {
    const d = diffDays(ctx.today, due)
    if (d < 0) add(100 + Math.min(40, -d * 5), -d === 1 ? 'Venció ayer' : `Venció hace ${-d} días`)
    else if (d === 0) {
      let w = 80
      let text = 'Vence hoy'
      if (dueTime) {
        text = `Vence hoy a las ${shortTime(dueTime)}`
        if (ctx.nowTime) {
          const left = minutesOfDay(dueTime) - minutesOfDay(ctx.nowTime)
          if (left < 0) {
            w += 30
            text = `Debía estar a las ${shortTime(dueTime)}`
          } else if (left <= 180) {
            w += 25
            text = left < 60 ? `Vence en ${left} min` : `Vence en ${Math.round(left / 60)} h`
          }
        }
      }
      add(w, text)
    } else if (d === 1) add(40, 'Vence mañana')
    else if (d <= 7) add(20 - d * 2, `Vence en ${d} días`)
  }

  const pw = { 1: 0, 2: 15, 3: 40, 4: 70 }[priority]
  add(pw, priority >= 3 ? `Prioridad ${PRIORITY_LABEL[priority]}` : undefined)

  const projectId = task.project_id ?? parent?.project_id
  if (projectId && ctx.projects) {
    const p = ctx.projects.find((x) => x.id === projectId)
    if (p && p.status === 'active') add(p.priority >= 3 ? 10 : 3, p.priority >= 3 ? `Proyecto prioritario: ${p.name}` : undefined)
  }

  const ageDays = diffDays(toDateKey(new Date(task.created_at)), ctx.today)
  if (ageDays >= 7) add(Math.min(10, Math.floor(ageDays / 3)), ageDays >= 14 ? `Lleva ${ageDays} días esperando` : undefined)

  if (task.estimated_minutes && task.estimated_minutes <= 15) add(5, `Victoria rápida: ${task.estimated_minutes} min`)

  reasons.sort((a, b) => b.w - a.w)
  return { task, parent, score, reasons: reasons.map((r) => r.text) }
}

/**
 * Candidatas: tareas abiertas. Una tarea con subtareas abiertas se sustituye
 * por su primera subtarea pendiente (el paso concreto siguiente).
 */
export function rankTasks(tasks: Task[], ctx: MoveContext): Scored[] {
  const open = tasks.filter((t) => t.status !== 'completed')
  const childrenOf = new Map<string, Task[]>()
  for (const t of open) {
    if (t.parent_id) {
      const list = childrenOf.get(t.parent_id) ?? []
      list.push(t)
      childrenOf.set(t.parent_id, list)
    }
  }
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const out: Scored[] = []
  for (const t of open) {
    if (t.parent_id) continue // las subtareas entran a través de su padre
    const kids = childrenOf.get(t.id)
    if (kids && kids.length) {
      const first = [...kids].sort(
        (a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.created_at.localeCompare(b.created_at),
      )[0]
      out.push(scoreTask(first, ctx, t))
    } else {
      out.push(scoreTask(t, ctx))
    }
  }
  // Subtareas huérfanas (padre completado o no cargado).
  for (const t of open) {
    if (t.parent_id && !open.some((p) => p.id === t.parent_id)) out.push(scoreTask(t, ctx, byId.get(t.parent_id) ?? null))
  }
  return out.sort((a, b) => b.score - a.score || a.task.created_at.localeCompare(b.task.created_at))
}

export function nextMove(tasks: Task[], ctx: MoveContext): Scored | null {
  return rankTasks(tasks, ctx)[0] ?? null
}

/** Contexto "ahora" en hora local. */
export function nowContext(now = new Date(), projects?: Project[]): MoveContext {
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return { today: toDateKey(now), nowTime: `${hh}:${mm}`, projects }
}
