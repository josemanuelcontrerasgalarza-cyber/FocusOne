'use client'

/**
 * Espacio de trabajo de Kairo: estado único (tareas, proyectos, objetivos,
 * hábitos, sesiones, ajustes) compartido por todas las pantallas. Todas las
 * mutaciones son OPTIMISTAS: la UI cambia al instante y, si el servidor falla,
 * se revierte y se avisa con un mensaje comprensible.
 */
import { create } from 'zustand'
import {
  getRepo,
  newGoal,
  newHabit,
  newProject,
  newTask,
  uuid,
  type Repo,
  type Snapshot,
} from '@/lib/data/repo'
import { errorMessage } from '@/lib/errors'
import { toast } from '@/lib/toast'
import { notificarESP32 } from '@/lib/notificarESP32'
import { nextOccurrence } from '@/lib/kairo/recurrence'
import { toDateKey } from '@/lib/kairo/dates'
import { goalProgress } from '@/lib/kairo/tasks'
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
  type TaskStatus,
  type Totals,
} from '@/lib/kairo/types'
import { useTheme } from '@/store/themeStore'

type Status = 'idle' | 'loading' | 'ready' | 'error'

export type SettingsPatch = Partial<Omit<KairoSettings, 'focus' | 'sound' | 'notifications' | 'shortcuts'>> & {
  focus?: Partial<KairoSettings['focus']>
  sound?: Partial<KairoSettings['sound']>
  notifications?: Partial<KairoSettings['notifications']>
  shortcuts?: Partial<KairoSettings['shortcuts']>
}

interface WorkspaceState {
  status: Status
  mode: 'cloud' | 'local'
  error: string | null
  userId: string | null
  tasks: Task[]
  projects: Project[]
  goals: Goal[]
  habits: Habit[]
  habitLogs: HabitLog[]
  sessions: FocusSession[]
  settings: KairoSettings
  profile: Profile | null
  totals: Totals | null

  load: () => Promise<void>
  clear: () => void

  addTask: (input: TaskInput, opts?: { silent?: boolean }) => Promise<Task | null>
  updateTask: (id: string, patch: TaskPatch) => Promise<void>
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  addProject: (input: ProjectInput) => Promise<Project | null>
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  addGoal: (input: GoalInput) => Promise<Goal | null>
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>
  bumpGoal: (id: string, delta: number) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  addHabit: (input: HabitInput) => Promise<Habit | null>
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  toggleHabitDay: (habitId: string, day: string) => Promise<void>

  startSession: (s: { task_id: string | null; planned_minutes: number; label: string | null; started_at?: string }) => Promise<FocusSession | null>
  finishSession: (id: string, patch: { ended_at: string; actual_seconds: number; completed: boolean }) => Promise<void>

  /** Refleja en local un cambio que YA hizo el servidor (no llama al repositorio). */
  patchTaskLocal: (id: string, patch: TaskPatch) => void

  updateSettings: (patch: SettingsPatch) => void
  setName: (name: string) => Promise<boolean>
  refreshTotals: () => void
  resetProductivity: () => Promise<boolean>
}

let repo: Repo | null = null
const R = () => (repo ??= getRepo())

let settingsTimer: ReturnType<typeof setTimeout> | null = null
let totalsTimer: ReturnType<typeof setTimeout> | null = null

function fail(err: unknown, fallback?: string) {
  toast.error(errorMessage(err, fallback))
}

const EMPTY = {
  tasks: [] as Task[],
  projects: [] as Project[],
  goals: [] as Goal[],
  habits: [] as Habit[],
  habitLogs: [] as HabitLog[],
  sessions: [] as FocusSession[],
}

export const useWorkspace = create<WorkspaceState>((set, get) => {
  /** Aplica un cambio local y, si la operación remota falla, lo revierte. */
  async function optimistic(apply: (s: WorkspaceState) => Partial<WorkspaceState>, remote: () => Promise<unknown>, onError?: string) {
    const before = get()
    const snapshot = {
      tasks: before.tasks,
      projects: before.projects,
      goals: before.goals,
      habits: before.habits,
      habitLogs: before.habitLogs,
      sessions: before.sessions,
    }
    set(apply(before))
    try {
      await remote()
      return true
    } catch (err) {
      set(snapshot)
      fail(err, onError)
      return false
    }
  }

  const uid = () => get().userId ?? 'local'

  async function maybeAchieveGoals(goalId: string | null) {
    if (!goalId) return
    const g = get().goals.find((x) => x.id === goalId)
    if (!g || g.status !== 'active' || g.target_value) return
    const p = goalProgress(g, get().tasks)
    if (p.total > 0 && p.done === p.total) {
      await get().updateGoal(g.id, { status: 'achieved', achieved_at: new Date().toISOString() })
      toast.success(`Objetivo cumplido: ${g.title}`)
    }
  }

  return {
    status: 'idle',
    mode: getRepo().mode,
    error: null,
    userId: null,
    ...EMPTY,
    settings: DEFAULT_SETTINGS,
    profile: null,
    totals: null,

    async load() {
      if (get().status === 'loading') return
      set({ status: 'loading', error: null, mode: R().mode })
      try {
        const snap: Snapshot = await R().load()
        set({ ...snap, status: 'ready' })
        // El tema guardado en la cuenta manda sobre el del navegador.
        if (snap.settings.theme && snap.settings.theme !== useTheme.getState().mode) {
          useTheme.getState().setMode(snap.settings.theme)
        }
        get().refreshTotals()
      } catch (err) {
        set({ status: 'error', error: errorMessage(err, 'No se pudieron cargar tus datos.') })
      }
    },

    clear() {
      set({ status: 'idle', userId: null, profile: null, totals: null, settings: DEFAULT_SETTINGS, ...EMPTY })
    },

    /* ─────────────── Tareas ─────────────── */

    async addTask(input, opts) {
      if (!input.title.trim()) return null
      const t = newTask(uid(), input)
      const ok = await optimistic((s) => ({ tasks: [...s.tasks, t] }), () => R().insertTask(t), 'No se pudo crear la tarea.')
      if (ok && !opts?.silent) toast.success('Tarea creada')
      return ok ? t : null
    },

    async updateTask(id, patch) {
      const p = { ...patch, updated_at: new Date().toISOString() }
      await optimistic(
        (s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) }),
        () => R().updateTask(id, patch),
        'No se pudo guardar la tarea.',
      )
    },

    async setTaskStatus(id, status) {
      if (status === 'completed') {
        const t = get().tasks.find((x) => x.id === id)
        if (t && t.status !== 'completed') return get().toggleTask(id)
        return
      }
      if (status === 'active') {
        await optimistic(
          (s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id ? { ...t, status: 'active', completed_at: null } : t.status === 'active' ? { ...t, status: 'pending' } : t,
            ),
          }),
          () => R().activateTask(id),
          'No se pudo poner la tarea en enfoque.',
        )
        return
      }
      await get().updateTask(id, { status, completed_at: null })
    },

    async toggleTask(id) {
      const t = get().tasks.find((x) => x.id === id)
      if (!t) return
      if (t.status === 'completed') {
        await get().updateTask(id, { status: 'pending', completed_at: null })
        return
      }
      const completed_at = new Date().toISOString()
      const ok = await optimistic(
        (s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, status: 'completed', completed_at } : x)) }),
        () => R().updateTask(id, { status: 'completed', completed_at }),
        'No se pudo completar la tarea.',
      )
      if (!ok) return

      // Recurrencia: crea la siguiente ocurrencia.
      let spawned: Task | null = null
      if (t.recurrence && !t.parent_id) {
        spawned = await get().addTask(
          {
            title: t.title,
            description: t.description,
            priority: t.priority,
            estimated_minutes: t.estimated_minutes,
            tags: t.tags,
            project_id: t.project_id,
            goal_id: t.goal_id,
            recurrence: t.recurrence,
            due_time: t.due_time,
            due_date: nextOccurrence(t.due_date, t.recurrence, toDateKey(new Date())),
          },
          { silent: true },
        )
      }
      if (R().mode === 'cloud' && get().userId) void notificarESP32(get().userId as string, 'tarea_completada')
      toast.success(spawned ? 'Hecho. Próxima repetición programada.' : 'Tarea completada', {
        action: {
          label: 'Deshacer',
          onClick: () => {
            void get().updateTask(id, { status: t.status === 'active' ? 'pending' : t.status, completed_at: null })
            if (spawned) void get().deleteTask(spawned.id)
          },
        },
      })
      get().refreshTotals()
      void maybeAchieveGoals(t.goal_id)
    },

    async deleteTask(id) {
      const all = get().tasks
      const drop = new Set([id])
      let grew = true
      while (grew) {
        grew = false
        for (const t of all) if (t.parent_id && drop.has(t.parent_id) && !drop.has(t.id)) {
          drop.add(t.id)
          grew = true
        }
      }
      await optimistic(
        (s) => ({ tasks: s.tasks.filter((t) => !drop.has(t.id)) }),
        () => R().deleteTask(id),
        'No se pudo eliminar la tarea.',
      )
    },

    /* ─────────────── Proyectos ─────────────── */

    async addProject(input) {
      const p = newProject(uid(), input)
      const ok = await optimistic((s) => ({ projects: [...s.projects, p] }), () => R().insertProject(p), 'No se pudo crear el proyecto.')
      if (ok) toast.success('Proyecto creado')
      return ok ? p : null
    },
    async updateProject(id, patch) {
      const p: Partial<Project> = { ...patch, updated_at: new Date().toISOString() }
      if (patch.status === 'completed') p.completed_at = new Date().toISOString()
      else if (patch.status) p.completed_at = null
      await optimistic(
        (s) => ({ projects: s.projects.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
        () => R().updateProject(id, p),
        'No se pudo guardar el proyecto.',
      )
    },
    async deleteProject(id) {
      await optimistic(
        (s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          tasks: s.tasks.map((t) => (t.project_id === id ? { ...t, project_id: null } : t)),
          goals: s.goals.map((g) => (g.project_id === id ? { ...g, project_id: null } : g)),
        }),
        () => R().deleteProject(id),
        'No se pudo eliminar el proyecto.',
      )
    },

    /* ─────────────── Objetivos ─────────────── */

    async addGoal(input) {
      const g = newGoal(uid(), input)
      const ok = await optimistic((s) => ({ goals: [...s.goals, g] }), () => R().insertGoal(g), 'No se pudo crear el objetivo.')
      if (ok) toast.success('Objetivo creado')
      return ok ? g : null
    },
    async updateGoal(id, patch) {
      await optimistic(
        (s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }),
        () => R().updateGoal(id, patch),
        'No se pudo guardar el objetivo.',
      )
      if (patch.status) get().refreshTotals()
    },
    async bumpGoal(id, delta) {
      const g = get().goals.find((x) => x.id === id)
      if (!g) return
      const current_value = Math.max(0, g.current_value + delta)
      const reached = g.target_value != null && current_value >= g.target_value && g.status === 'active'
      await get().updateGoal(id, {
        current_value,
        ...(reached ? { status: 'achieved', achieved_at: new Date().toISOString() } : {}),
      })
      if (reached) toast.success(`Objetivo cumplido: ${g.title}`)
    },
    async deleteGoal(id) {
      await optimistic(
        (s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          tasks: s.tasks.map((t) => (t.goal_id === id ? { ...t, goal_id: null } : t)),
        }),
        () => R().deleteGoal(id),
        'No se pudo eliminar el objetivo.',
      )
    },

    /* ─────────────── Hábitos ─────────────── */

    async addHabit(input) {
      const h = newHabit(uid(), input)
      const ok = await optimistic((s) => ({ habits: [...s.habits, h] }), () => R().insertHabit(h), 'No se pudo crear el hábito.')
      if (ok) toast.success('Hábito creado')
      return ok ? h : null
    },
    async updateHabit(id, patch) {
      await optimistic(
        (s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) }),
        () => R().updateHabit(id, patch),
        'No se pudo guardar el hábito.',
      )
    },
    async deleteHabit(id) {
      await optimistic(
        (s) => ({ habits: s.habits.filter((h) => h.id !== id), habitLogs: s.habitLogs.filter((l) => l.habit_id !== id) }),
        () => R().deleteHabit(id),
        'No se pudo eliminar el hábito.',
      )
    },
    async toggleHabitDay(habitId, day) {
      const on = !get().habitLogs.some((l) => l.habit_id === habitId && l.log_date === day)
      const log: HabitLog = { habit_id: habitId, user_id: uid(), log_date: day }
      await optimistic(
        (s) => ({
          habitLogs: on
            ? [...s.habitLogs, log]
            : s.habitLogs.filter((l) => !(l.habit_id === habitId && l.log_date === day)),
        }),
        () => R().setHabitLog(log, on),
        'No se pudo registrar el hábito.',
      )
      get().refreshTotals()
    },

    /* ─────────────── Enfoque ─────────────── */

    async startSession({ task_id, planned_minutes, label, started_at }) {
      const s: FocusSession = {
        id: uuid(),
        user_id: uid(),
        task_id,
        started_at: started_at ?? new Date().toISOString(),
        ended_at: null,
        planned_minutes,
        actual_seconds: 0,
        completed: false,
        label,
      }
      const ok = await optimistic((st) => ({ sessions: [...st.sessions, s] }), () => R().insertSession(s), 'No se pudo registrar la sesión.')
      return ok ? s : null
    },
    async finishSession(id, patch) {
      await optimistic(
        (s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
        () => R().updateSession(id, patch),
        'No se pudo guardar el resultado de la sesión.',
      )
      if (patch.completed && R().mode === 'cloud' && get().userId) {
        void notificarESP32(get().userId as string, 'pomodoro_completado')
      }
      get().refreshTotals()
    },

    patchTaskLocal(id, patch) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
    },

    /* ─────────────── Ajustes y perfil ─────────────── */

    updateSettings(patch) {
      const cur = get().settings
      const next = mergeSettings({
        ...cur,
        ...patch,
        focus: { ...cur.focus, ...(patch.focus ?? {}) },
        sound: { ...cur.sound, ...(patch.sound ?? {}) },
        notifications: { ...cur.notifications, ...(patch.notifications ?? {}) },
        shortcuts: { ...cur.shortcuts, ...(patch.shortcuts ?? {}) },
      })
      set({ settings: next })
      if (patch.theme) useTheme.getState().setMode(patch.theme)
      if (settingsTimer) clearTimeout(settingsTimer)
      settingsTimer = setTimeout(() => {
        R()
          .saveSettings(uid(), get().settings)
          .catch((err) => fail(err, 'No se pudieron guardar tus ajustes.'))
      }, 500)
    },

    async setName(name) {
      const clean = name.trim()
      if (!clean) return false
      const prev = get().profile
      set({ profile: prev ? { ...prev, name: clean } : prev })
      try {
        await R().setName(clean)
        return true
      } catch (err) {
        set({ profile: prev })
        fail(err, 'No se pudo cambiar tu nombre.')
        return false
      }
    },

    refreshTotals() {
      if (totalsTimer) clearTimeout(totalsTimer)
      totalsTimer = setTimeout(async () => {
        const s = get()
        try {
          const totals = await R().totals({
            tasks: s.tasks,
            projects: s.projects,
            goals: s.goals,
            habits: s.habits,
            habitLogs: s.habitLogs,
            sessions: s.sessions,
          })
          set({ totals })
        } catch {
          /* XP es informativa: sin red no se actualiza y ya */
        }
      }, 400)
    },

    async resetProductivity() {
      try {
        await R().resetProductivity()
        set({ ...EMPTY, totals: null })
        get().refreshTotals()
        return true
      } catch (err) {
        fail(err, 'No se pudieron borrar tus datos.')
        return false
      }
    },
  }
})

/* ─────────────── selectores útiles ─────────────── */

export const selectProject = (id: string | null | undefined) => (s: WorkspaceState) =>
  id ? s.projects.find((p) => p.id === id) ?? null : null
