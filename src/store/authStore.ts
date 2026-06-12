import { create } from 'zustand'
import { type Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { type Profile } from '@/types'
import { toast } from '@/lib/toast'

interface AuthState {
  user: Profile | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  refreshProfile: () => Promise<void>
}

let listenerRegistered = false

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        set({ session, user: profile, initialized: true })
      } else {
        set({ session: null, user: null, initialized: true })
      }
    } catch {
      set({ initialized: true })
    }

    if (!listenerRegistered) {
      listenerRegistered = true
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          set({ session: null, user: null })
        } else if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          set({ session, user: profile })
        } else if (session) {
          set({ session })
        }
      })
    }
  },

  refreshProfile: async () => {
    const session = get().session
    if (!session?.user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    if (profile) set({ user: profile })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Correo o contraseña incorrectos')
        }
        throw new Error('Error al iniciar sesión. Intenta de nuevo.')
      }
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email, password, name) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('Este correo ya está registrado')
        }
        throw new Error('Error al crear la cuenta. Intenta de nuevo.')
      }
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    toast.info('Sesión cerrada')
  },
}))
