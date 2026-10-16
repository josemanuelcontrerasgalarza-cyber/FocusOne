export interface Profile {
  id: string
  email: string
  name: string
  avatar_url?: string
  streak_current: number
  streak_best: number
  streak_last_date?: string
  // Solo existen en el esquema legado (schema.sql), no en setup_all.sql: opcionales.
  tasks_completed_total?: number
  projects_completed_total?: number
  created_at: string
}

/** Opinión anónima pública (landing). */
export interface Review {
  id: string
  name: string | null
  rating: number
  comment: string
  created_at: string
}

// === Misiones (tabla `missions`, base de las tareas) ===
export type MissionStatus = 'pending' | 'active' | 'completed'
export type MissionSource = 'user' | 'ai'

export interface Mission {
  id: string
  user_id: string
  title: string
  project?: string | null
  estimated_minutes: number
  status: MissionStatus
  source: MissionSource
  created_at: string
  completed_at?: string | null
  updated_at: string
}

// === Tienda de recompensas (Fase 6) ===
export type RewardType = 'playlist' | 'theme' | 'badge'

export interface Reward {
  id: string
  name: string
  description?: string | null
  type: RewardType
  cost_points: number
  icon?: string | null
  created_at: string
}

// === Focus Pet (mascota de enfoque) ===
export type PetItemKind = 'pet' | 'hat' | 'outfit' | 'accessory'

/** Ítem de la tienda (catálogo amplio). Los equipables van a Focus Pet. */
export interface StoreItem {
  id: string
  name: string
  kind: string
  emoji: string
  cost: number
}

export interface PetItem {
  id: string
  name: string
  kind: PetItemKind
  cost_points: number
  emoji: string
  created_at: string
}

export interface UserPet {
  user_id: string
  name: string
  pet_id: string | null
  hat_id: string | null
  outfit_id: string | null
  accessory_id: string | null
  updated_at: string
}
