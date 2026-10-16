'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useWorkspace } from '@/store/workspace'

/**
 * Cierra la sesión, limpia el espacio de trabajo en memoria y vuelve a la
 * portada. Gate por SESIÓN (no por el perfil): si el perfil aún no cargó, igual
 * debe poder cerrar sesión. Sin sesión (modo local) no se muestra.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const { session, signOut } = useAuthStore()
  const clear = useWorkspace((s) => s.clear)
  const [busy, setBusy] = useState(false)

  if (!session) return null

  async function handle() {
    setBusy(true)
    await signOut()
    clear()
    router.replace('/')
  }

  return (
    <Button variant="secondary" icon={<LogOut size={15} />} loading={busy} onClick={handle} className={className}>
      Cerrar sesión
    </Button>
  )
}
