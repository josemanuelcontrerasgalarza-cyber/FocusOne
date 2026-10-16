'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Check, Lock, Gem } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/primitives'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'
import { INFINITE } from '@/lib/developer'
import type { Reward } from '@/types'

interface Props {
  rewards: Reward[]
  unlockedIds: string[]
  points: number
  isDeveloper: boolean
  isDemo: boolean
}

const TYPE_LABEL: Record<Reward['type'], string> = {
  playlist: 'Playlist',
  theme: 'Tema',
  badge: 'Insignia',
}

/**
 * Tienda de recompensas: catálogo con estados bloqueado / disponible
 * / desbloqueada. El desbloqueo resta puntos vía RPC atómica en el backend.
 */
export function RewardsStore({ rewards, unlockedIds, points, isDeveloper, isDemo }: Props) {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Estado optimista: marca la recompensa como tuya y descuenta puntos al
  // instante para que un segundo clic no dispare otro unlock_reward (doble gasto).
  const [extraUnlocked, setExtraUnlocked] = useState<Set<string>>(new Set())
  const [spent, setSpent] = useState(0)

  // Al llegar props frescas del servidor (tras refresh), resetea lo optimista.
  useEffect(() => {
    setExtraUnlocked(new Set())
    setSpent(0)
  }, [unlockedIds, points])

  const unlocked = new Set([...unlockedIds, ...extraUnlocked])
  const displayPoints = Math.max(0, points - spent)
  const canUse = !isDemo && Boolean(uid)

  async function unlock(reward: Reward) {
    if (!canUse) {
      toast.info('Inicia sesión para desbloquear recompensas.')
      return
    }
    if (unlocked.has(reward.id)) return
    setBusyId(reward.id)
    try {
      const { error } = await supabase.rpc('unlock_reward', { p_reward: reward.id })
      if (error) throw error
      setExtraUnlocked((s) => new Set(s).add(reward.id))
      if (!isDeveloper) setSpent((s) => s + reward.cost_points) // dev: diamantes ∞
      toast.success(`Desbloqueada: ${reward.name}`)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('insuficientes')) toast.error('No tienes puntos suficientes.')
      else if (isDbSetupError(err)) toast.error(DB_SETUP_MSG)
      else toast.error('No se pudo desbloquear. Inténtalo de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card as="section">
      <CardHeader
        eyebrow="Recompensas"
        title="Desbloquea con tus puntos"
        action={<PointsPill points={displayPoints} isDeveloper={isDeveloper} />}
      />
      <ul className="grid grid-cols-1 gap-2 p-4 pt-3 sm:grid-cols-2 sm:p-5 sm:pt-3">
        {rewards.map((reward) => {
          const owned = unlocked.has(reward.id)
          const affordable = isDeveloper || displayPoints >= reward.cost_points
          const busy = busyId === reward.id
          return (
            <li
              key={reward.id}
              className={clsx(
                'flex items-center gap-3 rounded-control border p-3',
                owned ? 'border-success/25 bg-success/[0.06]' : 'border-line bg-raised',
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-sunken text-xl" aria-hidden>
                {reward.icon ?? '✦'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{reward.name}</p>
                <p className="truncate text-xs text-ink-faint">
                  {TYPE_LABEL[reward.type]}
                  {reward.description ? ` · ${reward.description}` : ''}
                </p>
              </div>

              {owned ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                  <Check size={13} strokeWidth={2.6} /> Tuya
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => unlock(reward)}
                  disabled={canUse && !affordable}
                  loading={busy}
                  icon={affordable || !canUse ? <Gem size={13} /> : <Lock size={13} />}
                  aria-label={`Desbloquear ${reward.name} por ${reward.cost_points} puntos`}
                  className="shrink-0 font-mono"
                >
                  {affordable || !canUse ? `${reward.cost_points}` : `Faltan ${reward.cost_points - displayPoints}`}
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {isDemo && (
        <p className="border-t border-line px-4 py-3 text-xs text-ink-faint sm:px-5">
          Vista previa: inicia sesión con una cuenta para desbloquear con tus puntos.
        </p>
      )}
    </Card>
  )
}

/** Saldo de puntos, discreto. */
export function PointsPill({ points, isDeveloper }: { points: number; isDeveloper: boolean }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-control border border-line bg-sunken px-2.5 text-[13px] text-ink-dim">
      <Gem size={13} />
      <span className="font-mono font-medium text-ink">{isDeveloper ? INFINITE : points}</span>
      <span className="text-ink-faint">pts</span>
    </span>
  )
}
