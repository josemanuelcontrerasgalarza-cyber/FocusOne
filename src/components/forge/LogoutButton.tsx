'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

/**
 * Cierra la sesión y vuelve al inicio. Reemplaza el logout que vivía en la
 * pantalla de ajustes glass (ya retirada).
 */
export function LogoutButton() {
  const router = useRouter()
  const { user, session, signOut } = useAuthStore()

  async function handle() {
    await signOut()
    router.replace('/')
  }

  // Gate por SESIÓN (no por el perfil): si el perfil aún no cargó, igual debe
  // poder cerrar sesión. Sin sesión (demo local) no mostramos el botón.
  if (!session) return null
  const email = session.user?.email ?? user?.email ?? ''

  return (
    <button
      onClick={handle}
      className="flex w-full items-center gap-3 rounded-forge border border-forge-line bg-forge-surface p-4 text-left transition-colors hover:border-forge-ink-faint"
    >
      <LogOut size={20} className="text-forge-ink-dim" />
      <div className="min-w-0 flex-1">
        <p className="font-forge text-[15px] font-semibold text-forge-ink">Cerrar sesión</p>
        <p className="truncate text-[13px] text-forge-ink-faint">{email}</p>
      </div>
    </button>
  )
}
