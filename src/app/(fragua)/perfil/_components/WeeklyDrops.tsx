'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Gem, Lock, Loader2, ArrowRight, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'
import type { PetItem } from '@/types'

interface Props {
  featured: PetItem[]
  ownedIds: string[]
  points: number
  isDemo: boolean
}

/**
 * "Ropa de la semana" para Focus Pet, dentro de la tienda de recompensas.
 * El servidor rota los ítems destacados cada semana. Se compran con puntos
 * (RPC buy_pet_item) y se equipan luego en Focus Pet.
 */
export function WeeklyDrops({ featured, ownedIds, points, isDemo }: Props) {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)
  const canUse = !isDemo && Boolean(uid)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Estado optimista: evita que un segundo clic dispare otra compra (doble gasto).
  const [extraOwned, setExtraOwned] = useState<Set<string>>(new Set())
  const [spent, setSpent] = useState(0)

  useEffect(() => {
    setExtraOwned(new Set())
    setSpent(0)
  }, [ownedIds, points])

  const owned = new Set([...ownedIds, ...extraOwned])
  const displayPoints = Math.max(0, points - spent)

  async function buy(item: PetItem) {
    if (owned.has(item.id)) return
    if (!canUse) {
      toast.info('Inicia sesión para comprar con puntos.')
      return
    }
    if (displayPoints < item.cost_points) {
      toast.error('Puntos insuficientes.')
      return
    }
    setBusyId(item.id)
    try {
      const { error } = await supabase.rpc('buy_pet_item', { p_item: item.id })
      if (error) throw error
      setExtraOwned((s) => new Set(s).add(item.id))
      setSpent((s) => s + item.cost_points)
      toast.success(`Compraste: ${item.name}. ¡Vístela en Focus Pet!`)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('insuficientes')) toast.error('Puntos insuficientes.')
      else if (isDbSetupError(err)) toast.error(DB_SETUP_MSG)
      else toast.error('No se pudo comprar.')
    } finally {
      setBusyId(null)
    }
  }

  if (featured.length === 0) return null

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-ember">
          <Sparkles size={13} /> Ropa de la semana · Focus Pet
        </div>
        <Link
          href="/mascota"
          className="inline-flex items-center gap-1 text-xs text-forge-ink-dim transition-colors hover:text-forge-ink"
        >
          Vestir <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {featured.map((item) => {
          const isOwned = owned.has(item.id)
          const affordable = displayPoints >= item.cost_points
          const busy = busyId === item.id
          const locked = !isOwned && canUse && !affordable
          return (
            <div
              key={item.id}
              className="flex flex-col items-center gap-2 rounded-forge border border-ember/25 bg-ember/[0.04] p-4 text-center"
            >
              <div className="relative">
                <span className="text-4xl">{item.emoji}</span>
                <span className="absolute -right-3 -top-2 rounded-full bg-ember px-1.5 py-0.5 font-num text-[8px] font-bold uppercase text-forge-canvas">
                  Nuevo
                </span>
              </div>
              <p className="font-forge text-sm font-semibold text-forge-ink">{item.name}</p>
              <button
                onClick={() => buy(item)}
                disabled={busy || isOwned || locked}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-forge text-xs font-bold transition-transform disabled:cursor-default ${
                  isOwned
                    ? 'border border-metal/40 bg-metal/10 text-metal'
                    : locked
                      ? 'cursor-not-allowed border border-forge-line text-forge-ink-faint'
                      : 'bg-ember text-forge-canvas shadow-ember hover:-translate-y-px'
                }`}
              >
                {busy ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : isOwned ? (
                  <Check size={12} strokeWidth={3} />
                ) : locked ? (
                  <Lock size={12} />
                ) : (
                  <Gem size={12} />
                )}
                {isOwned ? 'Tienes' : locked ? `Faltan ${item.cost_points - displayPoints}` : `${item.cost_points}`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
