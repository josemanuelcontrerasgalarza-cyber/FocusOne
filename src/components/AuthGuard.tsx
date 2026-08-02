'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
// El listener de auth se registra una sola vez en AuthProvider (raíz).
import { useAuthStore } from '@/store/authStore'
import { supabaseConfigured } from '@/lib/supabase'

export function ConfigNotice() {
  if (supabaseConfigured) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[110] flex justify-center p-3">
      <div className="rounded-forge border border-ember/40 bg-forge-surface px-4 py-2 text-xs text-ember shadow-ember">
        ⚠ Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY — configúralas en
        Vercel o .env.local
      </div>
    </div>
  )
}

function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-forge-canvas">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-full bg-ember shadow-ember" />
        <p className="font-num text-xs uppercase tracking-[0.3em] text-forge-ink-faint">
          Encendiendo la fragua
        </p>
      </div>
    </div>
  )
}

export function AuthGuard({ children }: { children: ReactNode }) {
  // Gate por SESIÓN, no por el perfil: si la fila de profiles falta o tarda en
  // cargar, la sesión sigue siendo válida y el usuario debe entrar igual.
  const { session, initialized } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (initialized && !session) router.replace('/login')
  }, [initialized, session, router])

  if (!initialized) return <BootScreen />
  if (!session) return <BootScreen />
  return <>{children}</>
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const { session, initialized } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // Entrada a La Fragua: tras login/registro, al dashboard "Hoy".
    if (initialized && session) router.replace('/hoy')
  }, [initialized, session, router])

  if (!initialized) return <BootScreen />
  if (session) return <BootScreen />
  return <>{children}</>
}
