'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HardDrive } from 'lucide-react'
// El listener de auth se registra una sola vez en AuthProvider (raíz).
import { useAuthStore } from '@/store/authStore'
import { supabaseConfigured } from '@/lib/supabase'
import { KairoMark } from '@/components/brand/Logo'

/**
 * Aviso cuando faltan las variables de Supabase: sin backend, Kairo funciona
 * en modo local (datos solo en este navegador) y no hace falta cuenta.
 */
export function ConfigNotice({ className }: { className?: string }) {
  if (supabaseConfigured) return null
  return (
    <div role="status" className={`rounded-card border border-line bg-surface p-4 ${className ?? ''}`}>
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-sunken text-ink-dim">
          <HardDrive size={15} />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-ink">Modo local</p>
          <p className="mt-1 leading-relaxed text-ink-dim">
            Este servidor no tiene configuradas <code className="font-mono text-[12px] text-ink">NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
            <code className="font-mono text-[12px] text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, así que no hay cuentas. Kairo
            funciona igual: tus datos se guardan solo en este navegador.
          </p>
          <Link
            href="/inicio"
            className="mt-2.5 inline-flex font-medium text-accent-fg underline-offset-4 hover:underline"
          >
            Abrir Kairo en modo local
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Pantalla de arranque mientras se resuelve la sesión. */
export function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas" aria-busy="true">
      <div className="flex flex-col items-center gap-4">
        <KairoMark className="h-10 w-10 animate-pulse text-ink [animation-duration:2.4s]" />
        <p className="k-eyebrow">Preparando tu espacio</p>
      </div>
    </div>
  )
}

/** `next` solo si es una ruta relativa segura (empieza por '/' y no por '//'). */
export function safeNext(raw: string | null | undefined, fallback = '/inicio'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}

export function AuthGuard({ children }: { children: ReactNode }) {
  // Gate por SESIÓN, no por el perfil: si la fila de profiles falta o tarda en
  // cargar, la sesión sigue siendo válida y el usuario debe entrar igual.
  const { session, initialized } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (initialized && !session) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [initialized, session, router, pathname])

  if (!initialized) return <BootScreen />
  if (!session) return <BootScreen />
  return <>{children}</>
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const { session, initialized } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // Tras entrar o registrarse: a `?next=` si es seguro; si no, a Inicio.
    if (!initialized || !session) return
    const next = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('next')
    router.replace(safeNext(next))
  }, [initialized, session, router])

  if (!initialized) return <BootScreen />
  if (session) return <BootScreen />
  return <>{children}</>
}
