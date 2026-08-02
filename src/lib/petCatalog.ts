import type { PetItem } from '@/types'

/**
 * Catálogo de Focus Pet definido EN CÓDIGO (no en la base de datos), para que
 * las mascotas y la ropa siempre se vean sin depender de un seed en Supabase.
 * Los `id` son claves estables (texto) que la BD usa para guardar posesión y
 * la mascota activa. Los costos son la fuente de verdad que valida la RPC.
 */
export const PET_CATALOG: PetItem[] = [
  { id: 'gato', name: 'Gato', kind: 'pet', cost_points: 0, emoji: '🐱', created_at: '' },
  { id: 'perro', name: 'Perro', kind: 'pet', cost_points: 0, emoji: '🐶', created_at: '' },
  { id: 'zorro', name: 'Zorro', kind: 'pet', cost_points: 80, emoji: '🦊', created_at: '' },
  { id: 'buho', name: 'Búho', kind: 'pet', cost_points: 120, emoji: '🦉', created_at: '' },
  { id: 'dragon', name: 'Dragón', kind: 'pet', cost_points: 300, emoji: '🐉', created_at: '' },
  { id: 'gorro', name: 'Gorro', kind: 'hat', cost_points: 30, emoji: '🎩', created_at: '' },
  { id: 'corona', name: 'Corona', kind: 'hat', cost_points: 150, emoji: '👑', created_at: '' },
  { id: 'bufanda', name: 'Bufanda', kind: 'outfit', cost_points: 40, emoji: '🧣', created_at: '' },
  { id: 'capa', name: 'Capa', kind: 'outfit', cost_points: 120, emoji: '🦸', created_at: '' },
  { id: 'gafas', name: 'Gafas', kind: 'accessory', cost_points: 25, emoji: '🕶️', created_at: '' },
  { id: 'medalla', name: 'Medalla', kind: 'accessory', cost_points: 60, emoji: '🏅', created_at: '' },
]
