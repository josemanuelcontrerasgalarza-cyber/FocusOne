import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase'
import { STORE_CATALOG } from '@/lib/storeCatalog'
import { readIsDeveloper } from '@/lib/developer'
import type { StoreItem } from '@/types'

export interface StoreData {
  catalog: StoreItem[]
  ownedIds: string[]
  points: number
  isDeveloper: boolean
  isDemo: boolean
}

/**
 * Datos de la Tienda. El catálogo viene del código (siempre visible); la BD solo
 * aporta qué posees (store_owned) y tus puntos. Comprar gasta puntos vía la RPC
 * buy_store_item, que valida el costo en el servidor.
 */
export async function getStoreData(): Promise<StoreData> {
  if (!supabaseConfigured) {
    return { catalog: STORE_CATALOG, ownedIds: [], points: 240, isDeveloper: false, isDemo: true }
  }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { catalog: STORE_CATALOG, ownedIds: [], points: 240, isDeveloper: false, isDemo: true }
  }

  const [owned, pts, isDeveloper] = await Promise.all([
    supabase.from('store_owned').select('item_id').eq('user_id', user.id).then((r) => r.data),
    supabase.from('points').select('total_points').eq('user_id', user.id).maybeSingle().then((r) => r.data),
    readIsDeveloper(supabase, user.id),
  ])

  return {
    catalog: STORE_CATALOG,
    ownedIds: (owned ?? []).map((o) => o.item_id as string),
    points: (pts as { total_points: number } | null)?.total_points ?? 0,
    isDeveloper,
    isDemo: false,
  }
}
