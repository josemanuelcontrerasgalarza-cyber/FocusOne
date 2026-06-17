'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

/**
 * Inicia una sesión anónima (Modo Demo) y entra directo al centro de mando.
 * No requiere registro: ideal para que cualquiera pruebe la app.
 */
export function DemoButton({ className }: { className?: string }) {
  const startDemo = useAuthStore((s) => s.startDemo)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDemo() {
    setLoading(true)
    try {
      await startDemo()
      router.replace('/app')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar el modo demo')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDemo}
      disabled={loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl border border-glass-border px-6 py-3.5 text-ink transition-all hover:border-core/50 hover:text-core disabled:opacity-60',
        className,
      )}
    >
      <Rocket size={16} />
      {loading ? 'Entrando…' : 'Probar sin registro'}
    </button>
  )
}
