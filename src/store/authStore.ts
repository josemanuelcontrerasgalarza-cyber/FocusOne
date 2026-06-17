import { create } from 'zustand'
import { type Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { type Profile } from '@/types'
import { toast } from '@/lib/toast'

interface AuthState {
  user: Profile | null
  session: Session | null
  isDemo: boolean
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  startDemo: () => Promise<void>
  upgradeAccount: (email: string, password: string, name: string) => Promise<void>
  /** Registra el listener de Supabase y devuelve la función de limpieza. */
  initialize: () => () => void
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isDemo: false,
  loading: false,
  initialized: false,

  initialize: () => {
    // onAuthStateChange emite INITIAL_SESSION al suscribirse, así que cubre tanto
    // la carga inicial como los cambios posteriores con un solo listener.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({ session, isDemo: session.user.is_anonymous === true })
        // La consulta se difiere para evitar el deadlock conocido de hacer
        // llamadas a supabase de forma síncrona dentro de este callback.
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          set({ user: profile ?? null, initialized: true })
        }, 0)
      } else {
        set({ session: null, user: null, isDemo: false, initialized: true })
      }
    })
    return () => subscription.unsubscribe()
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

  startDemo: async () => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        throw new Error(
          'No se pudo iniciar el modo demo. Activa los inicios de sesión anónimos en Supabase.',
        )
      }
      toast.success('Modo demo iniciado. ¡Concéntrate!')
    } catch (err) {
      set({ loading: false })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  // Convierte una cuenta demo (anónima) en una cuenta real conservando todos
  // sus datos: el id del usuario no cambia, así que tareas y proyectos quedan intactos.
  upgradeAccount: async (email, password, name) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.updateUser({ email, password, data: { name } })
      if (error) {
        if (error.message.includes('already')) throw new Error('Este correo ya está registrado')
        throw new Error('No se pudo guardar la cuenta. Intenta de nuevo.')
      }
      const uid = get().session?.user.id
      if (uid) await supabase.from('profiles').update({ email, name }).eq('id', uid)
      set({ isDemo: false })
      await get().refreshProfile()
      toast.success('Cuenta guardada. Revisa tu correo para confirmar el acceso.')
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    toast.info('Sesión cerrada')
  },
}))
