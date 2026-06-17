'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { supabaseConfigured } from '@/lib/supabase'
import { GlassPanel } from '@/glass/GlassPanel'

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

function BootScreen() {
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

  useEffect(() => {
    useAuthStore.getState().initialize()
  }, [])

  useEffect(() => {
    if (initialized && !user) router.replace('/login')
  }, [initialized, user, router])

  if (!initialized) return <BootScreen />
  if (!user) return <BootScreen />
  return <>{children}</>
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    useAuthStore.getState().initialize()
  }, [])

  useEffect(() => {
    if (initialized && user) router.replace('/app')
  }, [initialized, user, router])

  if (!initialized) return <BootScreen />
  if (user) return <BootScreen />
  return <>{children}</>
}
