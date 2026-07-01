import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { type Review } from '@/types'

/**
 * Opiniones anónimas públicas. Cualquiera puede leer y publicar (usa la clave
 * anon). Tolerante a que la tabla aún no exista: marca `available=false` y la
 * UI muestra un aviso en vez de romperse.
 */
interface ReviewState {
  reviews: Review[]
  loading: boolean
  submitting: boolean
  available: boolean
  fetchReviews: () => Promise<void>
  addReview: (data: { name: string; rating: number; comment: string }) => Promise<boolean>
}

export const useReviewStore = create<ReviewState>((set) => ({
  reviews: [],
  loading: false,
  submitting: false,
  available: true,

  fetchReviews: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      set({ loading: false, available: false })
      return
    }
    set({ reviews: data ?? [], loading: false, available: true })
  },

  addReview: async ({ name, rating, comment }) => {
    const clean = comment.trim()
    if (clean.length < 3) {
      toast.error('Escribe una opinión un poco más larga')
      return false
    }
    set({ submitting: true })
    const payload = { name: name.trim() || null, rating, comment: clean.slice(0, 500) }
    const { data, error } = await supabase.from('reviews').insert(payload).select().single()
    set({ submitting: false })
    if (error || !data) {
      toast.error('No se pudo enviar tu opinión')
      return false
    }
    set((s) => ({ reviews: [data, ...s.reviews] }))
    toast.success('¡Gracias por tu opinión!')
    return true
  },
}))
