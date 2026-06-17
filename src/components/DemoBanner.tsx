'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

/**
 * Aviso flotante para sesiones demo (anónimas): invita a guardar la cuenta
 * antes de perder el progreso. Se oculta automáticamente al convertir la cuenta.
 */
export function DemoBanner() {
  const isDemo = useAuthStore((s) => s.isDemo)
  if (!isDemo) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center p-3">
      <div className="glass-panel flex items-center gap-3 px-4 py-2 text-xs">
        <Sparkles size={14} className="shrink-0 text-solar" />
        <span className="text-ink-dim">Estás en modo demo — tu progreso es temporal.</span>
        <Link href="/settings" className="font-medium text-core hover:underline">
          Guardar cuenta
        </Link>
      </div>
    </div>
  )
}
