import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase'
import { REWARDS_CATALOG } from '@/lib/rewardsCatalog'
import type { Reward } from '@/types'

export interface RewardsData {
  rewards: Reward[]
  unlockedIds: string[]
  points: number
  isDemo: boolean
}

/**
 * Catálogo de recompensas (desde código, siempre visible) + lo que el usuario
 * ha desbloqueado + sus puntos. La BD solo aporta desbloqueos/puntos; si las
 * tablas no existen todavía, degrada mostrando el catálogo sin desbloqueos.
 */
export async function getRewardsData(): Promise<RewardsData> {
  if (!supabaseConfigured) {
    return { rewards: REWARDS_CATALOG, unlockedIds: [], points: 240, isDemo: true }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { rewards: REWARDS_CATALOG, unlockedIds: [], points: 240, isDemo: true }
  }

  const [unlocks, pts] = await Promise.all([
    supabase.from('reward_unlocks').select('reward_id').eq('user_id', user.id).then((r) => r.data),
    supabase.from('points').select('total_points').eq('user_id', user.id).maybeSingle().then((r) => r.data),
  ])

  return {
    rewards: REWARDS_CATALOG,
    unlockedIds: (unlocks ?? []).map((u) => u.reward_id as string),
    points: (pts as { total_points: number } | null)?.total_points ?? 0,
    isDemo: false,
  }
}
