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

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  goal?: string
  is_main: boolean
  progress: number
  status: 'active' | 'paused' | 'completed' | 'archived'
  start_date: string
  target_date?: string
  completed_at?: string
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  user_id: string
  title: string
  description?: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'completed'
  due_date?: string
  order_index: number
  completed_at?: string
  created_at: string
}

export interface Idea {
  id: string
  user_id: string
  title: string
  description?: string
  tags: string[]
  converted_to_project_id?: string
  created_at: string
}

export interface DailyStat {
  id: string
  user_id: string
  date: string
  tasks_completed: number
}

// === Tipos del sistema anterior (main / PR #9) ===
export interface FocusSession {
  id: string
  user_id: string
  task_id?: string | null
  started_at: string
  ended_at?: string | null
  planned_minutes: number
  completed: boolean
  created_at: string
}

/** Tarea con el nombre de su misión adjunto (para la agenda del dashboard). */
export interface AgendaTask extends Task {
  project_name?: string
}

/** Opinión anónima pública (landing). */
export interface Review {
  id: string
  name: string | null
  rating: number
  comment: string
  created_at: string
}

/** Conteo de actividad por día (gráficos del dashboard/telemetría). */
export interface DayCount {
  date: string
  count: number
}

/** Elemento del feed de actividad reciente del dashboard. */
export interface ActivityItem {
  id: string
  kind: 'task' | 'focus' | 'idea'
  title: string
  at: string
}

// === "La Fragua" — misiones ===
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

/** Una estadística del panel "Hoy" del dashboard. */
export interface TodayStat {
  label: string
  value: string
}

// === Quiz de cierre + puntos (Fase 4) ===
export interface QuizResult {
  id: string
  user_id: string
  mission_id: string
  questions_json: unknown
  score: number
  points_earned: number
  completed_at: string
}

export interface PointsRow {
  user_id: string
  total_points: number
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
