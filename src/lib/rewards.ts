import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase'
import type { Reward } from '@/types'

export interface RewardsData {
  rewards: Reward[]
  unlockedIds: string[]
  points: number
  isDemo: boolean
}

// Catálogo de muestra para demo (espeja el seed de 08_rewards.sql).
const DEMO_REWARDS: Reward[] = [
  { id: 'd1', name: 'Playlist Synthwave', description: 'Una frecuencia extra para tus sprints', type: 'playlist', cost_points: 50, icon: '🎧', created_at: '' },
  { id: 'd2', name: 'Playlist Lluvia', description: 'Ruido blanco para foco profundo', type: 'playlist', cost_points: 40, icon: '🌧️', created_at: '' },
  { id: 'd3', name: 'Tema Medianoche', description: 'Canvas aún más oscuro', type: 'theme', cost_points: 80, icon: '🌑', created_at: '' },
  { id: 'd4', name: 'Tema Brasa', description: 'Skin ember intensificada', type: 'theme', cost_points: 120, icon: '🔥', created_at: '' },
  { id: 'd5', name: 'Insignia Herrero', description: 'Distintivo por tu constancia', type: 'badge', cost_points: 200, icon: '🛠️', created_at: '' },
  { id: 'd6', name: 'Insignia Racha 30', description: 'Para forjadores implacables', type: 'badge', cost_points: 300, icon: '🏅', created_at: '' },
]

/**
 * Lee el catálogo de recompensas + lo que el usuario ha desbloqueado + sus
 * puntos. En demo devuelve el catálogo de muestra sin desbloqueos.
 */
export async function getRewardsData(): Promise<RewardsData> {
  if (!supabaseConfigured) {
    return { rewards: DEMO_REWARDS, unlockedIds: [], points: 240, isDemo: true }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { rewards: DEMO_REWARDS, unlockedIds: [], points: 240, isDemo: true }
  }

  const [{ data: rewards }, { data: unlocks }, { data: pts }] = await Promise.all([
    supabase.from('rewards').select('*').order('cost_points', { ascending: true }),
    supabase.from('reward_unlocks').select('reward_id').eq('user_id', user.id),
    supabase.from('points').select('total_points').eq('user_id', user.id).maybeSingle(),
  ])

  return {
    rewards: (rewards as Reward[]) ?? [],
    unlockedIds: (unlocks ?? []).map((u) => u.reward_id as string),
    points: pts?.total_points ?? 0,
    isDemo: false,
  }
}
