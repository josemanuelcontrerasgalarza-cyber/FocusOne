import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase'
import { PET_CATALOG } from '@/lib/petCatalog'
import { readIsDeveloper } from '@/lib/developer'
import type { PetItem, UserPet } from '@/types'

export interface PetData {
  catalog: PetItem[]
  ownedIds: string[]
  pet: UserPet | null
  points: number
  isDeveloper: boolean
  isDemo: boolean
}

/**
 * Datos de Focus Pet. El catálogo SIEMPRE viene del código (PET_CATALOG), así
 * que las mascotas y la ropa se ven sin necesidad de un seed en la BD. La base
 * de datos solo aporta: qué posees (pet_owned), tu mascota activa (user_pet) y
 * tus puntos. Si esas tablas aún no existen (migración 09 sin correr), degrada
 * con elegancia: se ve el catálogo, pero comprar/guardar requiere la migración.
 */
export async function getPetData(): Promise<PetData> {
  if (!supabaseConfigured) {
    return { catalog: PET_CATALOG, ownedIds: [], pet: null, points: 240, isDeveloper: false, isDemo: true }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { catalog: PET_CATALOG, ownedIds: [], pet: null, points: 240, isDeveloper: false, isDemo: true }
  }

  const [owned, pet, pts, isDeveloper] = await Promise.all([
    supabase.from('pet_owned').select('item_id').eq('user_id', user.id).then((r) => r.data),
    supabase.from('user_pet').select('*').eq('user_id', user.id).maybeSingle().then((r) => r.data),
    supabase.from('points').select('total_points').eq('user_id', user.id).maybeSingle().then((r) => r.data),
    readIsDeveloper(supabase, user.id),
  ])

  return {
    catalog: PET_CATALOG,
    ownedIds: (owned ?? []).map((o) => o.item_id as string),
    pet: (pet as UserPet | null) ?? null,
    points: (pts as { total_points: number } | null)?.total_points ?? 0,
    isDeveloper,
    isDemo: false,
  }
}
