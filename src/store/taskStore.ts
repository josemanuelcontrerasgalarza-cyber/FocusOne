import { create } from 'zustand'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { type Task } from '@/types'
import { toast } from '@/lib/toast'
import { useProjectStore } from './projectStore'
import { useAuthStore } from './authStore'

interface TaskState {
  tasks: Task[]
  loading: boolean
  fetchTasks: (projectId: string) => Promise<void>
  fetchUserPending: (userId: string) => Promise<Task[]>
  createTask: (data: Partial<Task>) => Promise<void>
  updateTask: (id: string, data: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string, projectId: string) => Promise<void>
}

async function updateStreak(userId: string) {
  const today = format(new Date(), 'yyyy-MM-dd')

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_current, streak_best, streak_last_date, tasks_completed_total')
    .eq('id', userId)
    .single()
  if (!profile) return

  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
  let newStreak = profile.streak_current
  if (profile.streak_last_date === today) {
    // ya contó hoy
  } else if (profile.streak_last_date === yesterday) {
    newStreak = profile.streak_current + 1
  } else {
    newStreak = 1
  }

  await supabase
    .from('profiles')
    .update({
      streak_current: newStreak,
      streak_best: Math.max(newStreak, profile.streak_best),
      streak_last_date: today,
      tasks_completed_total: (profile.tasks_completed_total ?? 0) + 1,
    })
    .eq('id', userId)

  await useAuthStore.getState().refreshProfile()
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (projectId) => {
    set({ loading: true })
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
      set({ loading: false })
      toast.error(err instanceof Error ? err.message : 'Error al cargar tareas')
    }
  },

  fetchUserPending: async (userId) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50)
    return data ?? []
  },

  createTask: async (data) => {
    try {
      const { data: task, error } = await supabase.from('tasks').insert(data).select().single()
      if (error) throw error
      set((state) => ({ tasks: [...state.tasks, task] }))
      if (data.project_id) {
        await useProjectStore.getState().updateProgress(data.project_id as string)
      }
      toast.success('Objetivo añadido')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear tarea')
    }
  },

  updateTask: async (id, data) => {
    try {
      const { error } = await supabase.from('tasks').update(data).eq('id', id)
      if (error) throw error
      set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)) }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar tarea')
    }
  },

  deleteTask: async (id) => {
    try {
      const task = useTaskStore.getState().tasks.find((t) => t.id === id)
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }))
      if (task?.project_id) {
        await useProjectStore.getState().updateProgress(task.project_id)
      }
      toast.success('Objetivo eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar tarea')
    }
  },

  completeTask: async (id, projectId) => {
    // Optimistic: la UI responde al instante, el servidor reconcilia después
    const now = new Date().toISOString()
    const prev = useTaskStore.getState().tasks
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: 'completed' as const, completed_at: now } : t,
      ),
    }))
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed', completed_at: now })
        .eq('id', id)
      if (error) throw error
      await useProjectStore.getState().updateProgress(projectId)
      const userId = useAuthStore.getState().user?.id
      if (userId) await updateStreak(userId)
    } catch (err) {
      set({ tasks: prev })
      toast.error(err instanceof Error ? err.message : 'Error al completar tarea')
    }
  },
}))
