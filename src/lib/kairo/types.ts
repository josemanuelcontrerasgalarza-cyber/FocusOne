/**
 * Tipos de dominio de Kairo. Módulo PURO (sin imports) para que la lógica de
 * negocio y sus pruebas no dependan de React, Next ni Supabase.
 */

export type TaskStatus = 'pending' | 'in_progress' | 'active' | 'completed'
/** 1 baja · 2 media · 3 alta · 4 urgente */
export type Priority = 1 | 2 | 3 | 4
export type Recurrence = 'daily' | 'weekdays' | 'weekly' | 'monthly'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  /** YYYY-MM-DD (fecha local) */
  due_date: string | null
  /** HH:MM */
  due_time: string | null
  estimated_minutes: number | null
  tags: string[]
  parent_id: string | null
  project_id: string | null
  goal_id: string | null
  recurrence: Recurrence | null
  position: number | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type TaskInput = Partial<
  Pick<
    Task,
    | 'description'
    | 'status'
    | 'priority'
    | 'due_date'
    | 'due_time'
    | 'estimated_minutes'
    | 'tags'
    | 'parent_id'
    | 'project_id'
    | 'goal_id'
    | 'recurrence'
    | 'position'
  >
> & { title: string }

export type TaskPatch = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  color: ProjectColor
  status: ProjectStatus
  priority: Priority
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type ProjectColor = 'lime' | 'sky' | 'violet' | 'rose' | 'amber' | 'teal' | 'slate'

export type ProjectInput = Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { name: string }

export type GoalStatus = 'active' | 'achieved' | 'archived'

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  color: ProjectColor
  /** null → el progreso sale de las tareas vinculadas */
  target_value: number | null
  current_value: number
  unit: string | null
  due_date: string | null
  status: GoalStatus
  project_id: string | null
  created_at: string
  achieved_at: string | null
}

export type GoalInput = Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'achieved_at'>> & { title: string }

export interface Habit {
  id: string
  user_id: string
  title: string
  icon: string
  color: ProjectColor
  /** días por semana (1..7) */
  target_per_week: number
  archived: boolean
  created_at: string
}

export type HabitInput = Partial<Omit<Habit, 'id' | 'user_id' | 'created_at'>> & { title: string }

export interface HabitLog {
  habit_id: string
  user_id: string
  log_date: string
}

export interface FocusSession {
  id: string
  user_id: string
  task_id: string | null
  started_at: string
  ended_at: string | null
  planned_minutes: number
  /** segundos REALMENTE enfocados (null en sesiones antiguas) */
  actual_seconds: number | null
  completed: boolean
  label: string | null
}

export interface Profile {
  id: string
  name: string | null
  email: string | null
  streak_current: number
  streak_best: number
}

export type QuickActionId =
  | 'new-task'
  | 'start-focus'
  | 'new-project'
  | 'new-goal'
  | 'open-calendar'
  | 'open-assistant'
  | 'open-stats'
  | 'open-music'

export interface KairoSettings {
  theme: 'light' | 'dark' | 'system'
  focus: {
    focusMinutes: number
    shortBreakMinutes: number
    longBreakMinutes: number
    longBreakEvery: number
    autoStartBreaks: boolean
    autoStartFocus: boolean
  }
  sound: { enabled: boolean; volume: number }
  dailyFocusGoalMinutes: number
  dailyTaskGoal: number
  notifications: { dueReminders: boolean; social: boolean; achievements: boolean }
  shortcuts: { enabled: boolean }
  quickActions: QuickActionId[]
}

export const DEFAULT_SETTINGS: KairoSettings = {
  theme: 'system',
  focus: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
  },
  sound: { enabled: true, volume: 0.6 },
  dailyFocusGoalMinutes: 120,
  dailyTaskGoal: 3,
  notifications: { dueReminders: true, social: true, achievements: true },
  shortcuts: { enabled: true },
  quickActions: ['new-task', 'start-focus', 'open-calendar', 'open-assistant'],
}

/** Mezcla profunda (2 niveles) de ajustes guardados con los valores por defecto. */
export function mergeSettings(saved: unknown): KairoSettings {
  const s = (saved && typeof saved === 'object' ? saved : {}) as Partial<KairoSettings>
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    focus: { ...DEFAULT_SETTINGS.focus, ...(s.focus ?? {}) },
    sound: { ...DEFAULT_SETTINGS.sound, ...(s.sound ?? {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(s.notifications ?? {}) },
    shortcuts: { ...DEFAULT_SETTINGS.shortcuts, ...(s.shortcuts ?? {}) },
    quickActions: Array.isArray(s.quickActions) ? s.quickActions : DEFAULT_SETTINGS.quickActions,
  }
}

export interface Totals {
  tasksCompleted: number
  focusMinutes: number
  habitLogs: number
  goalsAchieved: number
}
