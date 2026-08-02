'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/lib/toast'

/**
 * Botón de Modo Demo con el diseño de La Fragua. Inicia sesión anónima y entra
 * directo a /hoy. Mismo comportamiento que DemoButton pero estilo forge.
 */
export function ForgeDemoButton({ className = '' }: { className?: string }) {
  const startDemo = useAuthStore((s) => s.startDemo)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDemo() {
    setLoading(true)
    try {
      await startDemo()
      router.replace('/hoy')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar el modo demo')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDemo}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-forge-line bg-forge-surface px-7 py-3.5 font-forge text-[15px] font-semibold text-forge-ink transition-colors hover:border-ember/50 disabled:opacity-60 ${className}`}
    >
      <Rocket size={16} />
      {loading ? 'Entrando…' : 'Probar sin registro'}
    </button>
  )
}
