import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { type Idea } from '@/types'
import { toast } from '@/lib/toast'
import { useProjectStore } from './projectStore'

interface IdeaState {
  ideas: Idea[]
  loading: boolean
  fetchIdeas: (userId: string) => Promise<void>
  createIdea: (data: Partial<Idea>) => Promise<void>
  deleteIdea: (id: string) => Promise<void>
  convertToProject: (idea: Idea) => Promise<void>
}

export const useIdeaStore = create<IdeaState>((set) => ({
  ideas: [],
  loading: false,

  fetchIdeas: async (userId) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ ideas: data ?? [], loading: false })
    } catch (err) {
      set({ loading: false })
      toast.error(err instanceof Error ? err.message : 'Error al cargar ideas')
    }
  },

  createIdea: async (data) => {
    try {
      const { data: idea, error } = await supabase.from('ideas').insert(data).select().single()
      if (error) throw error
      set((state) => ({ ideas: [idea, ...state.ideas] }))
      toast.success('Idea capturada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar idea')
    }
  },

  deleteIdea: async (id) => {
    try {
      const { error } = await supabase.from('ideas').delete().eq('id', id)
      if (error) throw error
      set((state) => ({ ideas: state.ideas.filter((i) => i.id !== id) }))
      toast.success('Idea eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar idea')
    }
  },

  convertToProject: async (idea) => {
    const project = await useProjectStore.getState().createProject({
      user_id: idea.user_id,
      name: idea.title,
      description: idea.description,
    })
    if (!project) return
    await supabase.from('ideas').update({ converted_to_project_id: project.id }).eq('id', idea.id)
    set((state) => ({
      ideas: state.ideas.map((i) =>
        i.id === idea.id ? { ...i, converted_to_project_id: project.id } : i,
      ),
    }))
    toast.success('🚀 Idea convertida en misión')
  },
}))
