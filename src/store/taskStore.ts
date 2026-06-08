import { create } from 'zustand'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { type Task } from '../types'
import { toast } from '../lib/toast'
import { useProjectStore } from './projectStore'
import { useAuthStore } from './authStore'

interface TaskState {
  tasks: Task[]
  loading: boolean
  error: string | null
  fetchTasks: (projectId: string) => Promise<void>
  createTask: (data: Partial<Task>) => Promise<void>
  updateTask: (id: string, data: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string, projectId: string) => Promise<void>
}

async function updateStreak(userId: string) {
  const today = format(new Date(), 'yyyy-MM-dd')

  // Actualizar daily_stats
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (existing) {
    await supabase
      .from('daily_stats')
      .update({ tasks_completed: existing.tasks_completed + 1 })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('daily_stats')
      .insert({ user_id: userId, date: today, tasks_completed: 1 })
  }

  // Actualizar racha
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_current, streak_best, streak_last_date, tasks_completed_total')
    .eq('id', userId)
    .single()

  if (!profile) return

  const lastDate = profile.streak_last_date
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')

  let newStreak = profile.streak_current
  if (lastDate === today) {
    // Ya contó hoy, solo actualizar total
  } else if (lastDate === yesterday) {
    newStreak = profile.streak_current + 1
  } else {
    newStreak = 1
  }

  const newBest = Math.max(newStreak, profile.streak_best)

  await supabase
    .from('profiles')
    .update({
      streak_current: newStreak,
      streak_best: newBest,
      streak_last_date: today,
      tasks_completed_total: (profile.tasks_completed_total ?? 0) + 1,
    })
    .eq('id', userId)

  await useAuthStore.getState().refreshProfile()
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async (projectId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      set({ tasks: data ?? [], loading: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar tareas'
      set({ error: msg, loading: false })
      toast.error(msg)
    }
  },

  createTask: async (data) => {
    try {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      set(state => ({ tasks: [...state.tasks, task] }))
      if (data.project_id) {
        await useProjectStore.getState().updateProgress(data.project_id as string)
      }
      toast.success('Tarea creada')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear tarea'
      toast.error(msg)
    }
  },

  updateTask: async (id, data) => {
    try {
      const { error } = await supabase.from('tasks').update(data).eq('id', id)
      if (error) throw error
      set(state => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, ...data } : t) }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar tarea'
      toast.error(msg)
    }
  },

  deleteTask: async (id) => {
    try {
      const task = useTaskStore.getState().tasks.find(t => t.id === id)
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }))
      if (task?.project_id) {
        await useProjectStore.getState().updateProgress(task.project_id)
      }
      toast.success('Tarea eliminada')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar tarea'
      toast.error(msg)
    }
  },

  completeTask: async (id, projectId) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed', completed_at: now })
        .eq('id', id)
      if (error) throw error

      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === id ? { ...t, status: 'completed', completed_at: now } : t
        ),
      }))

      await useProjectStore.getState().updateProgress(projectId)

      const userId = useAuthStore.getState().user?.id
      if (userId) await updateStreak(userId)

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al completar tarea'
      toast.error(msg)
    }
  },
}))
