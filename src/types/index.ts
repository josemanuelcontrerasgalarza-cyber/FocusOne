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

/** KRATOS IA — conversación del chat. */
export interface KratosConversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

/** KRATOS IA — mensaje individual dentro de una conversación. */
export interface KratosMessage {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}
