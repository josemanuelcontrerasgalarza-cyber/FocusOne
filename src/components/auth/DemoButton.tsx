'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { supabaseConfigured } from '@/lib/supabase'
import { toast } from '@/lib/toast'

/**
 * "Probar sin registro": inicia una sesión anónima de Supabase y entra directo
 * a /inicio. Sin backend configurado (modo local) no hay sesión que crear:
 * entra directamente y los datos se guardan en este navegador.
 */
export function DemoButton({
  className,
  variant = 'secondary',
  size = 'lg',
  label = 'Probar sin registro',
}: {
  className?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  label?: string
}) {
  const startDemo = useAuthStore((s) => s.startDemo)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDemo() {
    if (!supabaseConfigured) {
      router.push('/inicio')
      return
    }
    setLoading(true)
    try {
      await startDemo()
      router.replace('/inicio')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar el modo de prueba.')
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleDemo} loading={loading} className={className}>
      {loading ? 'Preparando tu espacio…' : label}
    </Button>
  )
}
