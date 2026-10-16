'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Gem, Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/primitives'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'
import type { PetItem } from '@/types'

interface Props {
  featured: PetItem[]
  ownedIds: string[]
  points: number
  isDeveloper: boolean
  isDemo: boolean
}

/**
 * "Ropa de la semana" para la mascota, dentro de Perfil y recompensas.
 * El servidor rota los ítems destacados cada semana. Se compran con puntos
 * (RPC buy_store_item) y se equipan luego en Mascota.
 */
export function WeeklyDrops({ featured, ownedIds, points, isDeveloper, isDemo }: Props) {
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
    if (!isDeveloper && displayPoints < item.cost_points) {
      toast.error('Puntos insuficientes.')
      return
    }
    setBusyId(item.id)
    try {
      const { error } = await supabase.rpc('buy_store_item', { p_item: item.id })
      if (error) throw error
      setExtraOwned((s) => new Set(s).add(item.id))
      if (!isDeveloper) setSpent((s) => s + item.cost_points) // dev: diamantes ∞
      toast.success(`Compraste: ${item.name}. Pónsela en Mascota.`)
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
    <Card as="section">
      <CardHeader
        eyebrow="Esta semana"
        title="Ropa nueva para tu mascota"
        action={
          <Link
            href="/mascota"
            className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-[13px] font-medium text-ink-dim transition-colors hover:bg-sunken hover:text-ink"
          >
            Vestir <ArrowRight size={14} />
          </Link>
        }
      />
      <ul className="grid grid-cols-1 gap-2 p-4 pt-3 min-[480px]:grid-cols-3 sm:p-5 sm:pt-3">
        {featured.map((item) => {
          const isOwned = owned.has(item.id)
          const affordable = isDeveloper || displayPoints >= item.cost_points
          const busy = busyId === item.id
          const locked = !isOwned && canUse && !affordable
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-control border border-line bg-raised p-3 min-[480px]:flex-col min-[480px]:text-center"
            >
              <span className="text-[34px] leading-none" aria-hidden>
                {item.emoji}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink min-[480px]:w-full min-[480px]:flex-none">
                {item.name}
              </p>
              {isOwned ? (
                <span className="inline-flex h-8 shrink-0 items-center gap-1 text-xs font-medium text-success">
                  <Check size={13} strokeWidth={2.6} /> Tienes
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => buy(item)}
                  disabled={locked}
                  loading={busy}
                  icon={locked ? <Lock size={12} /> : <Gem size={12} />}
                  aria-label={`Comprar ${item.name} por ${item.cost_points} puntos`}
                  className="shrink-0 font-mono"
                >
                  {locked ? `Faltan ${item.cost_points - displayPoints}` : `${item.cost_points}`}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
