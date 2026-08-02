'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, Check, Loader2, Gem } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'

interface Props {
  claimedToday: boolean
  amount: number
  isDemo: boolean
}

/**
 * Recompensa diaria de diamantes: motiva a volver cada día. Se reclama una vez
 * al día (RPC claim_daily, que suma puntos en el servidor). El bono sube con la
 * racha. Banner visible en el dashboard "Hoy".
 */
export function DailyClaim({ claimedToday, amount, isDemo }: Props) {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)
  const [claimed, setClaimed] = useState(claimedToday)
  const [busy, setBusy] = useState(false)

  async function claim() {
    if (isDemo || !uid) {
      toast.info('Inicia sesión para reclamar tus diamantes.')
      return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('claim_daily')
      if (error) throw error
      setClaimed(true)
      toast.success(`+${data ?? amount} 💎 reclamados. ¡Vuelve mañana!`)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('reclamaste') || msg.includes('hoy')) {
        setClaimed(true)
        toast.info('Ya reclamaste tu recompensa de hoy.')
      } else if (isDbSetupError(err)) {
        toast.error(DB_SETUP_MSG)
      } else {
        toast.error('No se pudo reclamar. Inténtalo de nuevo.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-b border-forge-line bg-forge-surface/40 px-7 py-3 sm:px-14">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ember/15">
            <Gift size={18} className="text-ember" />
          </span>
          <div className="min-w-0">
            <p className="font-forge text-sm font-bold text-forge-ink">Recompensa diaria</p>
            <p className="truncate text-xs text-forge-ink-dim">
              {claimed
                ? 'Reclamada hoy · vuelve mañana por más'
                : 'Reclama tus diamantes de hoy. Sube con tu racha.'}
            </p>
          </div>
        </div>

        {claimed ? (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-metal/40 bg-metal/10 px-4 py-2 font-forge text-sm font-semibold text-metal">
            <Check size={15} strokeWidth={3} /> Reclamada
          </span>
        ) : (
          <button
            onClick={claim}
            disabled={busy}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-ember px-4 py-2 font-forge text-sm font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Gem size={14} />}
            Reclamar +{amount}
          </button>
        )}
      </div>
    </div>
  )
}
