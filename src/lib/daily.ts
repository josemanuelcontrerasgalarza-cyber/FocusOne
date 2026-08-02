import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase'
import { effectiveStreak } from '@/lib/streak'

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
 * Valor inicial de la recompensa diaria (solo el monto, según la racha). NO
 * decide "ya reclamó hoy": eso depende de la ZONA HORARIA del usuario, que solo
 * el navegador conoce, así que lo reconcilia el componente cliente (DailyClaim)
 * llamando a daily_claim_state con su fecha local. Aquí devolvemos
 * claimedToday=false para evitar desajustes SSR/cliente en el borde del día.
 */
export async function getDailyClaim(): Promise<DailyClaimState> {
  if (!supabaseConfigured) return { claimedToday: false, amount: 25, isDemo: true }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { claimedToday: false, amount: 25, isDemo: true }

  const profile = await supabase
    .from('profiles')
    .select('streak_current, streak_last_date')
    .eq('id', user.id)
    .maybeSingle()
    .then((r) => r.data as { streak_current: number; streak_last_date: string | null } | null)

  const streak = effectiveStreak(profile?.streak_current, profile?.streak_last_date)

  return { claimedToday: false, amount: dailyAmount(streak), isDemo: false }
}
