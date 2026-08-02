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

  // El estado (¿ya reclamó hoy? + monto) lo decide el servidor con current_date,
  // así no hay desajuste de zona horaria al comparar fechas en el cliente.
  const { data, error } = await supabase.rpc('daily_claim_state').single()

  if (error || !data) {
    // Sin la función/tablas aún (setup no corrido): degradar a "sin reclamar".
    const streak = await supabase
      .from('profiles')
      .select('streak_current')
      .eq('id', user.id)
      .maybeSingle()
      .then((r) => (r.data as { streak_current: number } | null)?.streak_current ?? 0)
    return { claimedToday: false, amount: dailyAmount(streak), isDemo: false }
  }

  const state = data as { claimed: boolean; amount: number }
  return { claimedToday: state.claimed, amount: state.amount, isDemo: false }
}
