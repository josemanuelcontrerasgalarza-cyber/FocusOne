import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase'
import type { PetItem, UserPet } from '@/types'

export interface PetData {
  catalog: PetItem[]
  ownedIds: string[]
  pet: UserPet | null
  points: number
  isDemo: boolean
}

// Espeja el seed de 09_focus_pet.sql para el modo demo.
const DEMO_CATALOG: PetItem[] = [
  { id: 'p-gato', name: 'Gato', kind: 'pet', cost_points: 0, emoji: '🐱', created_at: '' },
  { id: 'p-perro', name: 'Perro', kind: 'pet', cost_points: 0, emoji: '🐶', created_at: '' },
  { id: 'p-zorro', name: 'Zorro', kind: 'pet', cost_points: 80, emoji: '🦊', created_at: '' },
  { id: 'p-buho', name: 'Búho', kind: 'pet', cost_points: 120, emoji: '🦉', created_at: '' },
  { id: 'p-dragon', name: 'Dragón', kind: 'pet', cost_points: 300, emoji: '🐉', created_at: '' },
  { id: 'h-gorro', name: 'Gorro', kind: 'hat', cost_points: 30, emoji: '🎩', created_at: '' },
  { id: 'h-corona', name: 'Corona', kind: 'hat', cost_points: 150, emoji: '👑', created_at: '' },
  { id: 'o-bufanda', name: 'Bufanda', kind: 'outfit', cost_points: 40, emoji: '🧣', created_at: '' },
  { id: 'o-capa', name: 'Capa', kind: 'outfit', cost_points: 120, emoji: '🦸', created_at: '' },
  { id: 'a-gafas', name: 'Gafas', kind: 'accessory', cost_points: 25, emoji: '🕶️', created_at: '' },
  { id: 'a-medalla', name: 'Medalla', kind: 'accessory', cost_points: 60, emoji: '🏅', created_at: '' },
]

/** Datos de la pantalla Focus Pet: catálogo + posesión + mascota + puntos. */
export async function getPetData(): Promise<PetData> {
  if (!supabaseConfigured) {
    return { catalog: DEMO_CATALOG, ownedIds: [], pet: null, points: 240, isDemo: true }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { catalog: DEMO_CATALOG, ownedIds: [], pet: null, points: 240, isDemo: true }
  }

  const [{ data: catalog }, { data: owned }, { data: pet }, { data: pts }] =
    await Promise.all([
      supabase.from('pet_items').select('*').order('cost_points', { ascending: true }),
      supabase.from('pet_owned').select('item_id').eq('user_id', user.id),
      supabase.from('user_pet').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('points').select('total_points').eq('user_id', user.id).maybeSingle(),
    ])

  return {
    catalog: (catalog as PetItem[]) ?? [],
    ownedIds: (owned ?? []).map((o) => o.item_id as string),
    pet: (pet as UserPet | null) ?? null,
    points: pts?.total_points ?? 0,
    isDemo: false,
  }
}
