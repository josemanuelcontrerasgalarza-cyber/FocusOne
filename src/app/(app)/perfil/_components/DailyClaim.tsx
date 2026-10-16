'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, Check, Gem } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/primitives'
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
 * Fecha LOCAL del navegador en formato YYYY-MM-DD. La usamos como "el día de
 * hoy" del usuario para que el reclamo resetee a las 12:00 am de SU zona horaria
 * (reclamable hasta las 11:59 pm), no a medianoche UTC del servidor.
 */
function localDateStr(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/**
 * Recompensa diaria de diamantes: motiva a volver cada día. Se reclama una vez
 * al día (RPC claim_daily, que suma puntos en el servidor). El bono sube con la
 * racha. Vive en Perfil y recompensas.
 */
export function DailyClaim({ claimedToday, amount, isDemo }: Props) {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)
  const [claimed, setClaimed] = useState(claimedToday)
  const [amt, setAmt] = useState(amount)
  const [busy, setBusy] = useState(false)

  // Al montar, reconcilia el estado con el DÍA LOCAL del usuario (el servidor,
  // que renderizó el estado inicial, no conoce la zona horaria del navegador).
  useEffect(() => {
    if (isDemo || !uid) return
    let alive = true
    supabase
      .rpc('daily_claim_state', { p_local_date: localDateStr() })
      .single()
      .then(({ data }) => {
        if (!alive || !data) return
        const s = data as { claimed: boolean; amount: number }
        setClaimed(s.claimed)
        setAmt(s.amount)
      })
    return () => {
      alive = false
    }
  }, [isDemo, uid])

  async function claim() {
    if (isDemo || !uid) {
      toast.info('Inicia sesión para reclamar tus diamantes.')
      return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('claim_daily', {
        p_local_date: localDateStr(),
      })
      if (error) throw error
      setClaimed(true)
      toast.success(`+${data ?? amt} diamantes. Vuelve mañana.`)
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
    <Card as="section" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-sunken text-ink-dim">
          <Gift size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">Recompensa diaria</p>
          <p className="text-sm text-ink-dim">
            {claimed ? 'Reclamada hoy. Vuelve mañana.' : 'Tus diamantes de hoy. El bono crece con tu racha.'}
          </p>
        </div>
      </div>

      {claimed ? (
        <span className="inline-flex h-9 items-center gap-1.5 self-start rounded-control border border-success/25 bg-success/10 px-3 text-sm font-medium text-success sm:self-auto">
          <Check size={15} strokeWidth={2.6} /> Reclamada
        </span>
      ) : (
        <Button
          variant="secondary"
          onClick={claim}
          loading={busy}
          icon={<Gem size={15} />}
          className="self-start sm:self-auto"
        >
          Reclamar <span className="font-mono">+{amt}</span>
        </Button>
      )}
    </Card>
  )
}
