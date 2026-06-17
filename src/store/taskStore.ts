import { create } from 'zustand'
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
      // El progreso lo recalcula el trigger en Postgres; aquí solo lo releemos.
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
    // Optimistic: la UI responde al instante. El servidor (trigger en Postgres)
    // es el único que calcula racha, XP y progreso — el cliente no los falsifica.
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
      // Releemos lo que el trigger calculó en el servidor.
      await useProjectStore.getState().updateProgress(projectId)
      await useAuthStore.getState().refreshProfile()
    } catch (err) {
      set({ tasks: prev })
      toast.error(err instanceof Error ? err.message : 'Error al completar tarea')
    }
  },
}))
