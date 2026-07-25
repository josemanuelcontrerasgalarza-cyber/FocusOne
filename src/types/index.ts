export interface Profile {
  id: string
  email: string
  name: string
  avatar_url?: string
  streak_current: number
  streak_best: number
  streak_last_date?: string
  tasks_completed_total: number
  projects_completed_total: number
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
