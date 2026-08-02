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
  const { user, signOut } = useAuthStore()

  async function handle() {
    await signOut()
    router.replace('/')
  }

  // Sin sesión (demo local) no mostramos el botón.
  if (!user) return null

  return (
    <button
      onClick={handle}
      className="flex w-full items-center gap-3 rounded-forge border border-forge-line bg-forge-surface p-4 text-left transition-colors hover:border-forge-ink-faint"
    >
      <LogOut size={20} className="text-forge-ink-dim" />
      <div className="min-w-0 flex-1">
        <p className="font-forge text-[15px] font-semibold text-forge-ink">Cerrar sesión</p>
        <p className="truncate text-[13px] text-forge-ink-faint">{user.email}</p>
      </div>
    </button>
  )
}
