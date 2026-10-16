'use client'

/**
 * Repositorio de datos de Kairo con DOS implementaciones intercambiables:
 *
 *  - cloud: Supabase (RLS por usuario). Es el modo normal.
 *  - local: localStorage del navegador. SOLO se usa cuando el backend no está
 *    configurado (variables de entorno ausentes); la interfaz lo indica
 *    claramente. Permite usar y probar toda la app sin servidor.
 *
 * El resto de la app no sabe qué implementación hay debajo.
 */
import { supabase, supabaseConfigured } from '@/lib/supabase'
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type FocusSession,
  type Goal,
  type GoalInput,
  type Habit,
  type HabitInput,
  type HabitLog,
  type KairoSettings,
  type Profile,
  type Project,
  type ProjectInput,
  type Task,
  type TaskInput,
  type TaskPatch,
  type Totals,
} from '@/lib/kairo/types'

export interface Snapshot {
  userId: string
  tasks: Task[]
  projects: Project[]
  goals: Goal[]
  habits: Habit[]
  habitLogs: HabitLog[]
  sessions: FocusSession[]
  settings: KairoSettings
  profile: Profile
}

export interface Repo {
  mode: 'cloud' | 'local'
  load(): Promise<Snapshot>
  insertTask(t: Task): Promise<Task>
  updateTask(id: string, patch: TaskPatch): Promise<void>
  activateTask(id: string): Promise<void>
  deleteTask(id: string): Promise<void>
  insertProject(p: Project): Promise<Project>
  updateProject(id: string, patch: Partial<Project>): Promise<void>
  deleteProject(id: string): Promise<void>
  insertGoal(g: Goal): Promise<Goal>
  updateGoal(id: string, patch: Partial<Goal>): Promise<void>
  deleteGoal(id: string): Promise<void>
  insertHabit(h: Habit): Promise<Habit>
  updateHabit(id: string, patch: Partial<Habit>): Promise<void>
  deleteHabit(id: string): Promise<void>
  setHabitLog(log: HabitLog, on: boolean): Promise<void>
  insertSession(s: FocusSession): Promise<void>
  updateSession(id: string, patch: Partial<FocusSession>): Promise<void>
  saveSettings(userId: string, s: KairoSettings): Promise<void>
  setName(name: string): Promise<void>
  totals(snapshot: Omit<Snapshot, 'settings' | 'profile' | 'userId'>): Promise<Totals>
  resetProductivity(): Promise<void>
}

export const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

const nowIso = () => new Date().toISOString()

/* ─────────────────────────── normalización ─────────────────────────── */

const TASK_COLS =
  'id,user_id,title,description,status,priority,due_date,due_time,estimated_minutes,tags,parent_id,project_id,goal_id,recurrence,position,created_at,updated_at,completed_at'

function toTask(r: Record<string, unknown>): Task {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    title: String(r.title ?? ''),
    description: (r.description as string) ?? null,
    status: (r.status as Task['status']) ?? 'pending',
    priority: (Number(r.priority) || 2) as Task['priority'],
    due_date: (r.due_date as string) ?? null,
    due_time: r.due_time ? String(r.due_time).slice(0, 5) : null,
    estimated_minutes: r.estimated_minutes == null ? null : Number(r.estimated_minutes),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    parent_id: (r.parent_id as string) ?? null,
    project_id: (r.project_id as string) ?? null,
    goal_id: (r.goal_id as string) ?? null,
    recurrence: (r.recurrence as Task['recurrence']) ?? null,
    position: r.position == null ? null : Number(r.position),
    created_at: String(r.created_at ?? nowIso()),
    updated_at: String(r.updated_at ?? r.created_at ?? nowIso()),
    completed_at: (r.completed_at as string) ?? null,
  }
}

function toProject(r: Record<string, unknown>): Project {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    name: String(r.name ?? 'Proyecto'),
    description: (r.description as string) ?? null,
    color: ((r.color as string) || 'lime') as Project['color'],
    status: ((r.status as string) || 'active') as Project['status'],
    priority: (Number(r.priority) || 2) as Project['priority'],
    start_date: (r.start_date as string) ?? null,
    target_date: (r.target_date as string) ?? null,
    completed_at: (r.completed_at as string) ?? null,
    created_at: String(r.created_at ?? nowIso()),
    updated_at: String(r.updated_at ?? r.created_at ?? nowIso()),
  }
}

function toSession(r: Record<string, unknown>): FocusSession {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    task_id: (r.task_id as string) ?? null,
    started_at: String(r.started_at),
    ended_at: (r.ended_at as string) ?? null,
    planned_minutes: Number(r.planned_minutes) || 25,
    actual_seconds: r.actual_seconds == null ? null : Number(r.actual_seconds),
    completed: Boolean(r.completed),
    label: (r.label as string) ?? null,
  }
}

/** Solo las columnas que existen en `missions` (evita enviar campos de UI). */
function taskRow(t: Partial<Task>): Record<string, unknown> {
  const keys: (keyof Task)[] = [
    'id', 'user_id', 'title', 'description', 'status', 'priority', 'due_date', 'due_time', 'estimated_minutes',
    'tags', 'parent_id', 'project_id', 'goal_id', 'recurrence', 'position', 'completed_at',
  ]
  const row: Record<string, unknown> = {}
  for (const k of keys) if (k in t) row[k] = t[k]
  return row
}

const daysAgoIso = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

function computeTotals(s: Omit<Snapshot, 'settings' | 'profile' | 'userId'>): Totals {
  let focusMin = 0
  for (const x of s.sessions) {
    focusMin +=
      x.actual_seconds != null ? x.actual_seconds / 60 : x.completed ? x.planned_minutes : 0
  }
  return {
    tasksCompleted: s.tasks.filter((t) => t.status === 'completed').length,
    focusMinutes: Math.floor(focusMin),
    habitLogs: s.habitLogs.length,
    goalsAchieved: s.goals.filter((g) => g.status === 'achieved').length,
  }
}

/* ─────────────────────────── Supabase ─────────────────────────── */

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return data
}

const cloudRepo: Repo = {
  mode: 'cloud',

  async load() {
    const { data: auth } = await supabase.auth.getSession()
    const userId = auth.session?.user.id
    if (!userId) throw new Error('No hay sesión activa.')
    const since = daysAgoIso(180)
    const [tasks, projects, goals, habits, logs, sessions, settings, profile] = await Promise.all([
      must(
        supabase
          .from('missions')
          .select(TASK_COLS)
          .eq('user_id', userId)
          .or(`status.neq.completed,completed_at.gte.${since}`)
          .order('created_at', { ascending: true })
          .limit(3000),
      ),
      must(supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: true })),
      must(supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: true })),
      must(supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true })),
      must(
        supabase
          .from('habit_logs')
          .select('habit_id,user_id,log_date')
          .eq('user_id', userId)
          .gte('log_date', since.slice(0, 10)),
      ),
      must(
        supabase
          .from('focus_sessions')
          .select('*')
          .eq('user_id', userId)
          .gte('started_at', since)
          .order('started_at', { ascending: true }),
      ),
      supabase.from('user_settings').select('prefs').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('id,name,email,streak_current,streak_best').eq('id', userId).maybeSingle(),
    ])
    const prof = profile.data as Record<string, unknown> | null
    return {
      userId,
      tasks: (tasks as Record<string, unknown>[]).map(toTask),
      projects: (projects as Record<string, unknown>[]).map(toProject),
      goals: (goals ?? []) as Goal[],
      habits: (habits ?? []) as Habit[],
      habitLogs: (logs ?? []) as HabitLog[],
      sessions: (sessions as Record<string, unknown>[]).map(toSession),
      settings: mergeSettings((settings.data as { prefs?: unknown } | null)?.prefs),
      profile: {
        id: userId,
        name: (prof?.name as string) ?? auth.session?.user.user_metadata?.name ?? null,
        email: (prof?.email as string) ?? auth.session?.user.email ?? null,
        streak_current: Number(prof?.streak_current) || 0,
        streak_best: Number(prof?.streak_best) || 0,
      },
    }
  },

  async insertTask(t) {
    const row = await must(supabase.from('missions').insert(taskRow(t)).select(TASK_COLS).single())
    return toTask(row as Record<string, unknown>)
  },
  async updateTask(id, patch) {
    await must(supabase.from('missions').update(taskRow(patch)).eq('id', id))
  },
  async activateTask(id) {
    await must(supabase.rpc('activate_mission', { p_mission: id }))
  },
  async deleteTask(id) {
    await must(supabase.from('missions').delete().eq('id', id))
  },

  async insertProject(p) {
    const { id, user_id, name, description, color, status, priority, start_date, target_date } = p
    const row = await must(
      supabase
        .from('projects')
        .insert({ id, user_id, name, description, color, status, priority, start_date, target_date })
        .select('*')
        .single(),
    )
    return toProject(row as Record<string, unknown>)
  },
  async updateProject(id, patch) {
    const { name, description, color, status, priority, start_date, target_date, completed_at } = patch
    const row = Object.fromEntries(
      Object.entries({ name, description, color, status, priority, start_date, target_date, completed_at }).filter(
        ([, v]) => v !== undefined,
      ),
    )
    await must(supabase.from('projects').update({ ...row, updated_at: nowIso() }).eq('id', id))
  },
  async deleteProject(id) {
    await must(supabase.from('projects').delete().eq('id', id))
  },

  async insertGoal(g) {
    const { achieved_at: _a, created_at: _c, ...rest } = g
    return (await must(supabase.from('goals').insert(rest).select('*').single())) as Goal
  },
  async updateGoal(id, patch) {
    const { id: _i, user_id: _u, created_at: _c, achieved_at: _a, ...rest } = patch
    await must(supabase.from('goals').update(rest).eq('id', id))
  },
  async deleteGoal(id) {
    await must(supabase.from('goals').delete().eq('id', id))
  },

  async insertHabit(h) {
    const { created_at: _c, ...rest } = h
    return (await must(supabase.from('habits').insert(rest).select('*').single())) as Habit
  },
  async updateHabit(id, patch) {
    const { id: _i, user_id: _u, created_at: _c, ...rest } = patch
    await must(supabase.from('habits').update(rest).eq('id', id))
  },
  async deleteHabit(id) {
    await must(supabase.from('habits').delete().eq('id', id))
  },
  async setHabitLog(log, on) {
    if (on) await must(supabase.from('habit_logs').upsert(log, { onConflict: 'habit_id,log_date', ignoreDuplicates: true }))
    else await must(supabase.from('habit_logs').delete().eq('habit_id', log.habit_id).eq('log_date', log.log_date))
  },

  async insertSession(s) {
    await must(supabase.from('focus_sessions').insert(s))
  },
  async updateSession(id, patch) {
    const { id: _i, user_id: _u, ...rest } = patch
    await must(supabase.from('focus_sessions').update(rest).eq('id', id))
  },

  async saveSettings(userId, s) {
    await must(supabase.from('user_settings').upsert({ user_id: userId, prefs: s, updated_at: nowIso() }))
  },
  async setName(name) {
    await must(supabase.rpc('update_profile_name', { p_name: name }))
  },
  async totals(snap) {
    const { data, error } = await supabase.rpc('kairo_totals')
    if (error || !data) return computeTotals(snap)
    const d = data as Record<string, number>
    return {
      tasksCompleted: Number(d.tasks_completed) || 0,
      focusMinutes: Number(d.focus_minutes) || 0,
      habitLogs: Number(d.habit_logs) || 0,
      goalsAchieved: Number(d.goals_achieved) || 0,
    }
  },
  async resetProductivity() {
    await must(supabase.rpc('reset_my_productivity'))
  },
}

/* ─────────────────────────── Local (sin backend) ─────────────────────────── */

const LOCAL_KEY = 'kairo:local:v1'
interface LocalDB {
  tasks: Task[]
  projects: Project[]
  goals: Goal[]
  habits: Habit[]
  habitLogs: HabitLog[]
  sessions: FocusSession[]
  settings: KairoSettings
  profile: Profile
}

function readLocal(): LocalDB {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) {
      const d = JSON.parse(raw) as Partial<LocalDB>
      return {
        tasks: d.tasks ?? [],
        projects: d.projects ?? [],
        goals: d.goals ?? [],
        habits: d.habits ?? [],
        habitLogs: d.habitLogs ?? [],
        sessions: d.sessions ?? [],
        settings: mergeSettings(d.settings),
        profile: d.profile ?? { id: 'local', name: null, email: null, streak_current: 0, streak_best: 0 },
      }
    }
  } catch {}
  return {
    tasks: [],
    projects: [],
    goals: [],
    habits: [],
    habitLogs: [],
    sessions: [],
    settings: DEFAULT_SETTINGS,
    profile: { id: 'local', name: null, email: null, streak_current: 0, streak_best: 0 },
  }
}

function writeLocal(mut: (db: LocalDB) => void) {
  const db = readLocal()
  mut(db)
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(db))
  } catch {
    throw new Error('No se pudo guardar en este navegador (almacenamiento lleno o bloqueado).')
  }
}

const patchIn = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x))

const localRepo: Repo = {
  mode: 'local',
  async load() {
    const db = readLocal()
    return { userId: 'local', ...db }
  },
  async insertTask(t) {
    writeLocal((db) => db.tasks.push(t))
    return t
  },
  async updateTask(id, patch) {
    writeLocal((db) => (db.tasks = patchIn(db.tasks, id, { ...patch, updated_at: nowIso() })))
  },
  async activateTask(id) {
    writeLocal((db) => {
      db.tasks = db.tasks.map((t) =>
        t.id === id ? { ...t, status: 'active' } : t.status === 'active' ? { ...t, status: 'pending' } : t,
      )
    })
  },
  async deleteTask(id) {
    writeLocal((db) => {
      const drop = new Set([id])
      let grew = true
      while (grew) {
        grew = false
        for (const t of db.tasks) if (t.parent_id && drop.has(t.parent_id) && !drop.has(t.id)) {
          drop.add(t.id)
          grew = true
        }
      }
      db.tasks = db.tasks.filter((t) => !drop.has(t.id))
    })
  },
  async insertProject(p) {
    writeLocal((db) => db.projects.push(p))
    return p
  },
  async updateProject(id, patch) {
    writeLocal((db) => (db.projects = patchIn(db.projects, id, { ...patch, updated_at: nowIso() })))
  },
  async deleteProject(id) {
    writeLocal((db) => {
      db.projects = db.projects.filter((p) => p.id !== id)
      db.tasks = db.tasks.map((t) => (t.project_id === id ? { ...t, project_id: null } : t))
      db.goals = db.goals.map((g) => (g.project_id === id ? { ...g, project_id: null } : g))
    })
  },
  async insertGoal(g) {
    writeLocal((db) => db.goals.push(g))
    return g
  },
  async updateGoal(id, patch) {
    writeLocal((db) => (db.goals = patchIn(db.goals, id, patch)))
  },
  async deleteGoal(id) {
    writeLocal((db) => {
      db.goals = db.goals.filter((g) => g.id !== id)
      db.tasks = db.tasks.map((t) => (t.goal_id === id ? { ...t, goal_id: null } : t))
    })
  },
  async insertHabit(h) {
    writeLocal((db) => db.habits.push(h))
    return h
  },
  async updateHabit(id, patch) {
    writeLocal((db) => (db.habits = patchIn(db.habits, id, patch)))
  },
  async deleteHabit(id) {
    writeLocal((db) => {
      db.habits = db.habits.filter((h) => h.id !== id)
      db.habitLogs = db.habitLogs.filter((l) => l.habit_id !== id)
    })
  },
  async setHabitLog(log, on) {
    writeLocal((db) => {
      db.habitLogs = db.habitLogs.filter((l) => !(l.habit_id === log.habit_id && l.log_date === log.log_date))
      if (on) db.habitLogs.push(log)
    })
  },
  async insertSession(s) {
    writeLocal((db) => db.sessions.push(s))
  },
  async updateSession(id, patch) {
    writeLocal((db) => (db.sessions = patchIn(db.sessions, id, patch)))
  },
  async saveSettings(_u, s) {
    writeLocal((db) => (db.settings = s))
  },
  async setName(name) {
    writeLocal((db) => (db.profile = { ...db.profile, name }))
  },
  async totals(snap) {
    return computeTotals(snap)
  },
  async resetProductivity() {
    writeLocal((db) => {
      db.tasks = []
      db.projects = []
      db.goals = []
      db.habits = []
      db.habitLogs = []
      db.sessions = []
    })
  },
}

export function getRepo(): Repo {
  return supabaseConfigured ? cloudRepo : localRepo
}

/* ─────────────────────────── fábricas ─────────────────────────── */

export function newTask(userId: string, input: TaskInput): Task {
  const ts = nowIso()
  return {
    id: uuid(),
    user_id: userId,
    title: input.title.trim().slice(0, 200),
    description: input.description ?? null,
    status: input.status ?? 'pending',
    priority: input.priority ?? 2,
    due_date: input.due_date ?? null,
    due_time: input.due_time ?? null,
    estimated_minutes: input.estimated_minutes ?? null,
    tags: input.tags ?? [],
    parent_id: input.parent_id ?? null,
    project_id: input.project_id ?? null,
    goal_id: input.goal_id ?? null,
    recurrence: input.recurrence ?? null,
    position: input.position ?? Date.now(),
    created_at: ts,
    updated_at: ts,
    completed_at: null,
  }
}

export function newProject(userId: string, input: ProjectInput): Project {
  const ts = nowIso()
  return {
    id: uuid(),
    user_id: userId,
    name: input.name.trim().slice(0, 120),
    description: input.description ?? null,
    color: input.color ?? 'lime',
    status: input.status ?? 'active',
    priority: input.priority ?? 2,
    start_date: input.start_date ?? null,
    target_date: input.target_date ?? null,
    completed_at: null,
    created_at: ts,
    updated_at: ts,
  }
}

export function newGoal(userId: string, input: GoalInput): Goal {
  return {
    id: uuid(),
    user_id: userId,
    title: input.title.trim().slice(0, 160),
    description: input.description ?? null,
    color: input.color ?? 'lime',
    target_value: input.target_value ?? null,
    current_value: input.current_value ?? 0,
    unit: input.unit ?? null,
    due_date: input.due_date ?? null,
    status: input.status ?? 'active',
    project_id: input.project_id ?? null,
    created_at: nowIso(),
    achieved_at: null,
  }
}

export function newHabit(userId: string, input: HabitInput): Habit {
  return {
    id: uuid(),
    user_id: userId,
    title: input.title.trim().slice(0, 120),
    icon: input.icon ?? '•',
    color: input.color ?? 'lime',
    target_per_week: input.target_per_week ?? 7,
    archived: input.archived ?? false,
    created_at: nowIso(),
  }
}
