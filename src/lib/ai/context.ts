/**
 * Construye el contexto COMPACTO que se envía al asistente. Solo lo necesario
 * para planificar: nada de ids de usuario, correos, notas de hábitos ni
 * historial completo. Módulo puro (probado en ai.test.ts).
 */
import { WEEKDAYS_LONG, fromDateKey, shortTime } from '../kairo/dates.ts'
import { nowContext, rankTasks } from '../kairo/priority.ts'
import { lastDays, summarize } from '../kairo/stats.ts'
import { dueBucket, goalProgress, projectProgress, subtasksOf } from '../kairo/tasks.ts'
import type { FocusSession, Goal, Habit, HabitLog, Priority, Project, Task } from '../kairo/types.ts'
import { LIMITS, type AssistantContext, type ContextFocusTask, type ContextTask, type PriorityLabel } from './types.ts'

export interface ContextInput {
  tasks: Task[]
  projects: Project[]
  goals: Goal[]
  habits: Habit[]
  habitLogs: HabitLog[]
  sessions: FocusSession[]
  dailyFocusGoalMinutes: number
  now?: Date
  /** tarea elegida para dividir / desbloquear */
  focusTaskId?: string
  /** máximo de tareas incluidas */
  maxTasks?: number
}

const PRIORITY: Record<Priority, PriorityLabel> = { 1: 'baja', 2: 'media', 3: 'alta', 4: 'urgente' }
const STATUS: Record<Exclude<Task['status'], 'completed'>, ContextTask['status']> = {
  pending: 'pendiente',
  in_progress: 'en curso',
  active: 'en enfoque',
}

const cut = (s: string, max: number) => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

function toContextTask(t: Task, opts: { tasks: Task[]; projectName: Map<string, string>; nextStep?: Task | null; why?: string[] }): ContextTask {
  const out: ContextTask = {
    id: t.id,
    title: cut(t.title, 100),
    priority: PRIORITY[t.priority] ?? 'media',
    status: STATUS[t.status as keyof typeof STATUS] ?? 'pendiente',
  }
  if (t.due_date) out.due = t.due_date
  const time = shortTime(t.due_time)
  if (time && t.due_date) out.time = time
  if (t.estimated_minutes) out.estimate = t.estimated_minutes
  if (t.project_id) {
    const name = opts.projectName.get(t.project_id)
    if (name) out.project = cut(name, 60)
  }
  const openSubs = opts.tasks.filter((x) => x.parent_id === t.id && x.status !== 'completed').length
  if (openSubs) out.subtasks = openSubs
  if (opts.nextStep) out.nextStep = cut(opts.nextStep.title, 100)
  if (opts.why?.length) out.why = opts.why.slice(0, 2)
  return out
}

export function buildFocusTask(task: Task, tasks: Task[], projects: Project[]): ContextFocusTask {
  const project = task.project_id ? projects.find((p) => p.id === task.project_id) : null
  const out: ContextFocusTask = {
    id: task.id,
    title: cut(task.title, 160),
    priority: PRIORITY[task.priority] ?? 'media',
    subtasks: subtasksOf(tasks, task.id)
      .slice(0, 20)
      .map((s) => ({ title: cut(s.title, 100), done: s.status === 'completed' })),
  }
  if (task.description?.trim()) out.description = cut(task.description, 600)
  if (project) out.project = cut(project.name, 60)
  if (task.due_date) out.due = task.due_date
  if (task.estimated_minutes) out.estimate = task.estimated_minutes
  return out
}

export function buildContext(input: ContextInput): AssistantContext {
  const now = input.now ?? new Date()
  const move = nowContext(now, input.projects)
  const today = move.today
  const { tasks, projects } = input
  const projectName = new Map(projects.map((p) => [p.id, p.name]))
  const open = tasks.filter((t) => t.status !== 'completed')
  const byId = new Map(tasks.map((t) => [t.id, t]))

  // Ranking del motor local. Si la candidata es una subtarea de una tarea
  // abierta, se comparte la tarea padre con su siguiente paso (así "programar
  // para hoy" actúa sobre la tarea que el usuario reconoce).
  const ranked = rankTasks(tasks, move)
  const seen = new Set<string>()
  const allTasks: ContextTask[] = []
  for (const s of ranked) {
    const parent = s.parent && s.parent.status !== 'completed' ? s.parent : null
    const subject = parent ?? s.task
    if (seen.has(subject.id)) continue
    seen.add(subject.id)
    allTasks.push(
      toContextTask(subject, {
        tasks,
        projectName,
        nextStep: parent ? s.task : null,
        why: allTasks.length < 12 ? s.reasons : undefined,
      }),
    )
  }

  const habitsDone = new Set(input.habitLogs.filter((l) => l.log_date === today).map((l) => l.habit_id))
  const week = summarize(input.sessions, tasks, lastDays(today, 7))
  const todaySum = summarize(input.sessions, tasks, [today])

  const focusTaskSrc = input.focusTaskId ? byId.get(input.focusTaskId) : undefined

  const make = (maxTasks: number, lean: boolean): AssistantContext => {
    const shared = allTasks.slice(0, maxTasks).map((t) => (lean ? { ...t, why: undefined } : t))
    const ctx: AssistantContext = {
      now: { date: today, time: move.nowTime ?? '', weekday: WEEKDAYS_LONG[fromDateKey(today).getDay()] },
      counts: {
        open: open.filter((t) => !t.parent_id).length,
        overdue: open.filter((t) => dueBucket(t, today) === 'overdue').length,
        dueToday: open.filter((t) => dueBucket(t, today) === 'today').length,
        shared: shared.length,
      },
      tasks: shared,
      projects: projects
        .filter((p) => p.status === 'active')
        .slice(0, lean ? 8 : 15)
        .map((p) => {
          const pr = projectProgress(p.id, tasks)
          const row: AssistantContext['projects'][number] = {
            name: cut(p.name, 60),
            done: pr.done,
            total: pr.total,
            priority: PRIORITY[p.priority] ?? 'media',
          }
          if (p.target_date) row.target = p.target_date
          return row
        }),
      goals: input.goals
        .filter((g) => g.status === 'active')
        .slice(0, lean ? 6 : 12)
        .map((g) => {
          const pr = goalProgress(g, tasks)
          const row: AssistantContext['goals'][number] = {
            title: cut(g.title, 80),
            percent: Math.round(pr.ratio * 100),
            detail: g.target_value
              ? `${g.current_value}/${g.target_value}${g.unit ? ' ' + cut(g.unit, 20) : ''}`
              : `${pr.done}/${pr.total} tareas`,
          }
          if (g.due_date) row.due = g.due_date
          return row
        }),
      focus: {
        todayMinutes: todaySum.focusMinutes,
        dailyGoalMinutes: Math.max(0, Math.round(input.dailyFocusGoalMinutes || 0)),
        last7Days: {
          minutes: week.focusMinutes,
          sessions: week.sessions,
          tasksDone: week.tasksDone,
          activeDays: week.activeDays,
        },
      },
      habits: input.habits
        .filter((h) => !h.archived)
        .slice(0, lean ? 8 : 15)
        .map((h) => ({ title: cut(h.title, 60), doneToday: habitsDone.has(h.id), perWeek: h.target_per_week })),
    }
    if (focusTaskSrc) ctx.focusTask = buildFocusTask(focusTaskSrc, tasks, projects)
    return ctx
  }

  // Ajuste al límite del servidor (con margen): primero menos motivos, luego menos tareas.
  const budget = LIMITS.contextChars - 600
  let n = Math.max(0, input.maxTasks ?? 40)
  let ctx = make(n, false)
  if (JSON.stringify(ctx).length <= budget) return ctx
  ctx = make(n, true)
  while (JSON.stringify(ctx).length > budget && n > 0) {
    n = Math.max(0, n - 5)
    ctx = make(n, true)
  }
  return ctx
}
