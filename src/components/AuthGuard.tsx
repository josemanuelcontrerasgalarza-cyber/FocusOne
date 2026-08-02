'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
// El listener de auth se registra una sola vez en AuthProvider (raíz).
import { useAuthStore } from '@/store/authStore'
import { supabaseConfigured } from '@/lib/supabase'
import { GlassPanel } from '@/glass/GlassPanel'

// Si Supabase no responde (red caída, proyecto mal configurado) no queremos
// dejar a alguien mirando un spinner para siempre — a los 8s mostramos un
// aviso con la opción de reintentar.
function useBootTimeout(initialized: boolean, ms = 8000) {
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (initialized) return
    const id = setTimeout(() => setTimedOut(true), ms)
    return () => clearTimeout(id)
  }, [initialized, ms])
  return timedOut
}

export function ConfigNotice() {
  if (supabaseConfigured) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[110] flex justify-center p-3">
      <GlassPanel tilt={false} className="px-4 py-2 text-xs text-solar">
        ⚠ Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY — configúralas en
        Vercel o .env.local
      </GlassPanel>
    </div>
  )
}

function BootScreen({ timedOut }: { timedOut?: boolean }) {
  if (timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="flex max-w-xs flex-col items-center gap-3 text-center">
          <p className="font-data text-xs uppercase tracking-[0.3em] text-ink-ghost">
            Esto está tardando más de lo normal
          </p>
          <p className="text-sm text-forge-ink-dim">
            No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-1 rounded-full bg-ember px-5 py-2.5 font-forge text-sm font-bold text-forge-canvas shadow-ember"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-full bg-gradient-to-br from-core to-plasma shadow-glow-core" />
        <p className="font-data text-xs uppercase tracking-[0.3em] text-ink-ghost">
          Iniciando sistemas
        </p>
      </div>
    </div>
  )
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuthStore()
  const router = useRouter()
  const timedOut = useBootTimeout(initialized)

  useEffect(() => {
    if (initialized && !user) router.replace('/login')
  }, [initialized, user, router])

  if (!initialized) return <BootScreen timedOut={timedOut} />
  if (!user) return <BootScreen />
  return <>{children}</>
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuthStore()
  const router = useRouter()
  const timedOut = useBootTimeout(initialized)

  useEffect(() => {
    // Entrada a La Fragua: tras login/registro, al dashboard "Hoy".
    if (initialized && user) router.replace('/hoy')
  }, [initialized, user, router])

  if (!initialized) return <BootScreen timedOut={timedOut} />
  if (user) return <BootScreen />
  return <>{children}</>
}
