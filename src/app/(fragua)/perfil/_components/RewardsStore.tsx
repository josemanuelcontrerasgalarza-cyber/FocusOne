'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Lock, Loader2, Gem } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'
import type { Reward } from '@/types'

interface Props {
  rewards: Reward[]
  unlockedIds: string[]
  points: number
  isDemo: boolean
}

const TYPE_LABEL: Record<Reward['type'], string> = {
  playlist: 'Playlist',
  theme: 'Tema',
  badge: 'Insignia',
}

/**
 * Tienda de recompensas (Fase 6): catálogo con estados bloqueado / disponible
 * / desbloqueada. El desbloqueo resta puntos vía RPC atómica en el backend.
 */
export function RewardsStore({ rewards, unlockedIds, points, isDemo }: Props) {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)
  const [busyId, setBusyId] = useState<string | null>(null)

  const unlocked = new Set(unlockedIds)
  const canUse = !isDemo && Boolean(uid)

  async function unlock(reward: Reward) {
    if (!canUse) {
      toast.info('Inicia sesión para desbloquear recompensas.')
      return
    }
    setBusyId(reward.id)
    try {
      const { error } = await supabase.rpc('unlock_reward', { p_reward: reward.id })
      if (error) throw error
      toast.success(`Desbloqueada: ${reward.name} 🔥`)
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
          Tienda de recompensas
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Gem size={14} className="text-forge-ink-dim" />
          <span className="font-num font-semibold text-forge-ink">{points}</span>
          <span className="text-forge-ink-faint">pts</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rewards.map((reward) => {
          const owned = unlocked.has(reward.id)
          const affordable = points >= reward.cost_points
          const busy = busyId === reward.id
          return (
            <div
              key={reward.id}
              className={`flex items-center gap-3 rounded-forge border p-4 ${
                owned
                  ? 'border-metal/30 bg-metal/[0.06]'
                  : 'border-forge-line bg-forge-surface'
              }`}
            >
              <span className="shrink-0 text-2xl">{reward.icon ?? '✦'}</span>
              <div className="min-w-0 flex-1">
                <p className="font-forge text-[15px] font-semibold leading-tight text-forge-ink">
                  {reward.name}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-forge-ink-faint">
                  {TYPE_LABEL[reward.type]}
                  {reward.description ? ` · ${reward.description}` : ''}
                </p>
              </div>

              {owned ? (
                <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-metal/40 bg-metal/10 px-3 py-1.5 font-forge text-xs font-semibold text-metal">
                  <Check size={13} strokeWidth={3} /> Tuya
                </span>
              ) : (
                <button
                  onClick={() => unlock(reward)}
                  disabled={busy || (canUse && !affordable)}
                  className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-forge text-xs font-bold transition-transform ${
                    affordable || !canUse
                      ? 'bg-ember text-forge-canvas shadow-ember hover:-translate-y-px disabled:opacity-40'
                      : 'cursor-not-allowed border border-forge-line text-forge-ink-faint'
                  }`}
                >
                  {busy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : affordable || !canUse ? (
                    <Gem size={13} />
                  ) : (
                    <Lock size={13} />
                  )}
                  {affordable || !canUse
                    ? `${reward.cost_points}`
                    : `Faltan ${reward.cost_points - points}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {isDemo && (
        <p className="mt-4 text-center text-xs text-forge-ink-faint">
          Vista previa (demo): inicia sesión para desbloquear con tus puntos.
        </p>
      )}
    </div>
  )
}
