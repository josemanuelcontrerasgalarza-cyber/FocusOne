import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Rol de desarrollador (perfil.is_developer). Da diamantes ilimitados, todo
 * desbloqueado y sin límites. Se ACTIVA solo desde SQL admin (ver setup_all.sql);
 * el cliente no puede escribir profiles, así que nadie se auto-asigna el rol.
 * Aquí solo LEEMOS el flag propio (permitido por la policy profiles_select_own).
 */

/** Puntos "ilimitados" que muestran las cuentas developer (∞ en la UI). */
export const DEV_POINTS = 999999

/** Símbolo mostrado en lugar del saldo de diamantes para el developer. */
export const INFINITE = '∞'

/** ¿La cuenta indicada es de desarrollador? */
export async function readIsDeveloper(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_developer')
    .eq('id', userId)
    .maybeSingle()
  return Boolean((data as { is_developer?: boolean } | null)?.is_developer)
}
