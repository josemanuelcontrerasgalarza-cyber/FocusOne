import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase'

export interface DailyClaimState {
  claimedToday: boolean
  amount: number // lo que ganaría/ganó hoy
  isDemo: boolean
}

/** Monto del día: base 20 + hasta 15 por racha (espeja la RPC claim_daily). */
function dailyAmount(streak: number): number {
  return 20 + Math.min(Math.max(streak, 0), 15)
}

/**
 * Estado de la recompensa diaria del usuario: si ya la reclamó hoy y cuánto
 * vale. En demo/sin sesión devuelve un valor de muestra sin reclamar.
 */
export async function getDailyClaim(): Promise<DailyClaimState> {
  if (!supabaseConfigured) return { claimedToday: false, amount: 25, isDemo: true }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { claimedToday: false, amount: 25, isDemo: true }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const [claim, profile] = await Promise.all([
    supabase
      .from('daily_claims')
      .select('claim_date')
      .eq('user_id', user.id)
      .eq('claim_date', todayStr)
      .maybeSingle()
      .then((r) => r.data),
    supabase
      .from('profiles')
      .select('streak_current')
      .eq('id', user.id)
      .maybeSingle()
      .then((r) => r.data),
  ])

  const streak = (profile as { streak_current: number } | null)?.streak_current ?? 0
  return {
    claimedToday: Boolean(claim),
    amount: dailyAmount(streak),
    isDemo: false,
  }
}
