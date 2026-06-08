import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { type Project } from '../types'
import { toast } from '../lib/toast'

interface ProjectState {
  projects: Project[]
  mainProject: Project | null
  loading: boolean
  error: string | null
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
  error: null,

  fetchProjects: async (userId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const projects = data ?? []
      const mainProject = projects.find(p => p.is_main) ?? null
      set({ projects, mainProject, loading: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar proyectos'
      set({ error: msg, loading: false })
      toast.error(msg)
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
      set(state => ({ projects: [project, ...state.projects] }))
      toast.success('Proyecto creado')
      return project
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear proyecto'
      toast.error(msg)
      return null
    }
  },

  updateProject: async (id, data) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id)
      if (error) throw error
      set(state => {
        const projects = state.projects.map(p => p.id === id ? { ...p, ...data } : p)
        const mainProject = projects.find(p => p.is_main) ?? null
        return { projects, mainProject }
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar proyecto'
      toast.error(msg)
    }
  },

  deleteProject: async (id) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      set(state => {
        const projects = state.projects.filter(p => p.id !== id)
        const mainProject = state.mainProject?.id === id ? null : state.mainProject
        return { projects, mainProject }
      })
      toast.success('Proyecto eliminado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar proyecto'
      toast.error(msg)
    }
  },

  setMainProject: async (id, userId) => {
    try {
      // Desactivar proyecto principal actual
      await supabase
        .from('projects')
        .update({ is_main: false })
        .eq('user_id', userId)
        .eq('is_main', true)

      // Activar el nuevo
      const { error } = await supabase
        .from('projects')
        .update({ is_main: true })
        .eq('id', id)
      if (error) throw error

      set(state => {
        const projects = state.projects.map(p => ({
          ...p,
          is_main: p.id === id,
        }))
        const mainProject = projects.find(p => p.is_main) ?? null
        return { projects, mainProject }
      })
      toast.success('🎯 Misión actualizada')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar misión'
      toast.error(msg)
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
      const completed = tasks?.filter(t => t.status === 'completed').length ?? 0
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

      await get().updateProject(projectId, { progress })
    } catch {
      // silencioso
    }
  },
}))
