/**
 * Tipos compartidos del asistente (cliente ⇄ /api/assistant). Módulo PURO,
 * sin imports, para que lo usen el servidor, el cliente y las pruebas.
 */

export const ASSISTANT_MODES = ['chat', 'plan', 'breakdown', 'unblock', 'review'] as const
export type AssistantMode = (typeof ASSISTANT_MODES)[number]

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Cuerpo de POST /api/assistant. */
export interface AssistantRequest {
  mode: AssistantMode
  message?: string
  history?: HistoryMessage[]
  context: AssistantContext
  taskId?: string
}

/* ───────────────────────── Contexto compacto ───────────────────────── */

export type PriorityLabel = 'baja' | 'media' | 'alta' | 'urgente'

export interface ContextTask {
  id: string
  title: string
  priority: PriorityLabel
  /** YYYY-MM-DD */
  due?: string
  /** HH:MM */
  time?: string
  /** minutos estimados por el usuario */
  estimate?: number
  status: 'pendiente' | 'en curso' | 'en enfoque'
  project?: string
  /** subtareas abiertas */
  subtasks?: number
  /** siguiente subtarea abierta (el paso concreto) */
  nextStep?: string
  /** motivos del motor local de prioridad */
  why?: string[]
}

export interface ContextFocusTask {
  id: string
  title: string
  description?: string
  project?: string
  due?: string
  estimate?: number
  priority: PriorityLabel
  /** títulos de subtareas existentes (abiertas y hechas) */
  subtasks: { title: string; done: boolean }[]
}

export interface AssistantContext {
  now: { date: string; time: string; weekday: string }
  counts: { open: number; overdue: number; dueToday: number; shared: number }
  tasks: ContextTask[]
  projects: { name: string; done: number; total: number; target?: string; priority: PriorityLabel }[]
  goals: { title: string; percent: number; detail: string; due?: string }[]
  focus: {
    todayMinutes: number
    dailyGoalMinutes: number
    last7Days: { minutes: number; sessions: number; tasksDone: number; activeDays: number }
  }
  habits: { title: string; doneToday: boolean; perWeek: number }[]
  focusTask?: ContextFocusTask
}

/* ───────────────────────── Respuestas ───────────────────────── */

export interface PlanBlock {
  taskId?: string
  title: string
  minutes: number
  why: string
}

export interface Plan {
  summary: string
  blocks: PlanBlock[]
}

export interface BreakdownStep {
  title: string
  minutes?: number
}

export interface Breakdown {
  steps: BreakdownStep[]
}

export type AssistantResponse =
  | { mode: 'plan'; plan: Plan }
  | { mode: 'breakdown'; taskId: string; breakdown: Breakdown }
  | { mode: 'chat' | 'unblock' | 'review'; text: string }

export type AssistantErrorCode =
  | 'ai_not_configured'
  | 'unauthorized'
  | 'rate_limited'
  | 'invalid_request'
  | 'upstream_auth'
  | 'upstream_rate_limited'
  | 'upstream_timeout'
  | 'upstream_error'
  | 'bad_model_output'

export interface AssistantErrorBody {
  error: AssistantErrorCode
  message: string
}

/* ───────────────────────── Límites ───────────────────────── */

export const LIMITS = {
  message: 2000,
  historyItems: 10,
  historyContent: 2000,
  contextChars: 14000,
  taskId: 120,
  planBlocks: 10,
  breakdownMin: 3,
  breakdownMax: 8,
  stepTitle: 120,
  text: 4000,
} as const
