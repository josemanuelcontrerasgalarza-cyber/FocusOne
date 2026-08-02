'use client'

import { useEffect } from 'react'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-nova/5 blur-[120px]" />
      </div>
      <GlassPanel className="relative w-full max-w-sm p-8 text-center" tilt={false}>
        <p className="font-data text-xs uppercase tracking-[0.3em] text-ink-ghost">
          Fallo de sistema
        </p>
        <h1 className="mt-3 font-display text-2xl font-semibold">
          Algo <span className="text-gradient">se rompió</span>
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          No se pudo cargar esta pantalla. Tus datos están a salvo — intenta de nuevo.
        </p>
        <Button fullWidth size="lg" className="mt-6" onClick={reset}>
          Reintentar
        </Button>
      </GlassPanel>
    </div>
  )
}
