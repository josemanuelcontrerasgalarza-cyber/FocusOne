import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { type Idea } from '../types'
import { toast } from '../lib/toast'
import { useProjectStore } from './projectStore'
import { useAuthStore } from './authStore'

interface IdeaState {
  ideas: Idea[]
  loading: boolean
  error: string | null
  fetchIdeas: (userId: string) => Promise<void>
  createIdea: (data: Partial<Idea>) => Promise<void>
  deleteIdea: (id: string) => Promise<void>
  convertToProject: (idea: Idea, projectData: { name: string; description?: string; goal?: string; target_date?: string }) => Promise<string | null>
}

export const useIdeaStore = create<IdeaState>((set) => ({
  ideas: [],
  loading: false,
  error: null,

  fetchIdeas: async (userId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ ideas: data ?? [], loading: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar ideas'
      set({ error: msg, loading: false })
      toast.error(msg)
    }
  },

  createIdea: async (data) => {
    try {
      const { data: idea, error } = await supabase
        .from('ideas')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      set(state => ({ ideas: [idea, ...state.ideas] }))
      toast.success('Idea guardada 💡')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar idea'
      toast.error(msg)
    }
  },

  deleteIdea: async (id) => {
    try {
      const { error } = await supabase.from('ideas').delete().eq('id', id)
      if (error) throw error
      set(state => ({ ideas: state.ideas.filter(i => i.id !== id) }))
      toast.success('Idea eliminada')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar idea'
      toast.error(msg)
    }
  },

  convertToProject: async (idea, projectData) => {
    try {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('No hay sesión activa')

      const project = await useProjectStore.getState().createProject({
        ...projectData,
        user_id: userId,
        status: 'active',
      })
      if (!project) throw new Error('No se pudo crear el proyecto')

      const { error } = await supabase
        .from('ideas')
        .update({ converted_to_project_id: project.id })
        .eq('id', idea.id)
      if (error) throw error

      set(state => ({
        ideas: state.ideas.map(i =>
          i.id === idea.id ? { ...i, converted_to_project_id: project.id } : i
        ),
      }))
      toast.success('Idea convertida en proyecto ✅')
      return project.id
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al convertir idea'
      toast.error(msg)
      return null
    }
  },
}))
