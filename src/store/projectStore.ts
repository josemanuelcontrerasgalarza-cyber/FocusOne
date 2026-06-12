import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { type Project } from '@/types'
import { toast } from '@/lib/toast'

interface ProjectState {
  projects: Project[]
  mainProject: Project | null
  loading: boolean
  fetchProjects: (userId: string) => Promise<void>
  createProject: (data: Partial<Project>) => Promise<Project | null>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setMainProject: (id: string, userId: string) => Promise<void>
  updateProgress: (projectId: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  mainProject: null,
  loading: false,

  fetchProjects: async (userId) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const projects = data ?? []
      set({ projects, mainProject: projects.find((p) => p.is_main) ?? null, loading: false })
    } catch (err) {
      set({ loading: false })
      toast.error(err instanceof Error ? err.message : 'Error al cargar proyectos')
    }
  },

  createProject: async (data) => {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      set((state) => ({ projects: [project, ...state.projects] }))
      toast.success('Misión creada')
      return project
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear proyecto')
      return null
    }
  },

  updateProject: async (id, data) => {
    try {
      const { error } = await supabase.from('projects').update(data).eq('id', id)
      if (error) throw error
      set((state) => {
        const projects = state.projects.map((p) => (p.id === id ? { ...p, ...data } : p))
        return { projects, mainProject: projects.find((p) => p.is_main) ?? null }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar proyecto')
    }
  },

  deleteProject: async (id) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        mainProject: state.mainProject?.id === id ? null : state.mainProject,
      }))
      toast.success('Misión eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar proyecto')
    }
  },

  setMainProject: async (id, userId) => {
    try {
      await supabase
        .from('projects')
        .update({ is_main: false })
        .eq('user_id', userId)
        .eq('is_main', true)
      const { error } = await supabase.from('projects').update({ is_main: true }).eq('id', id)
      if (error) throw error
      set((state) => {
        const projects = state.projects.map((p) => ({ ...p, is_main: p.id === id }))
        return { projects, mainProject: projects.find((p) => p.is_main) ?? null }
      })
      toast.success('🎯 Misión principal actualizada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar misión')
    }
  },

  updateProgress: async (projectId) => {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('status')
        .eq('project_id', projectId)
      if (error) throw error
      const total = tasks?.length ?? 0
      const completed = tasks?.filter((t) => t.status === 'completed').length ?? 0
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100)
      await get().updateProject(projectId, { progress })
    } catch {
      // silencioso: el progreso se reconciliará en la siguiente acción
    }
  },
}))
