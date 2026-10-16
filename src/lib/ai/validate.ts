/**
 * Validación DEFENSIVA del cuerpo de la petición y de la salida del modelo.
 * Módulo puro (sin React/Next) con pruebas en ai.test.ts.
 */
import {
  ASSISTANT_MODES,
  LIMITS,
  type AssistantMode,
  type AssistantRequest,
  type AssistantContext,
  type Breakdown,
  type BreakdownStep,
  type HistoryMessage,
  type Plan,
  type PlanBlock,
} from './types.ts'

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Recorta y compacta espacios; corta a `max` caracteres. */
export function clean(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

/* ───────────────────────── Petición ───────────────────────── */

export function validateRequest(body: unknown): Result<AssistantRequest> {
  if (!isObject(body)) return { ok: false, error: 'El cuerpo debe ser un objeto JSON.' }

  const mode = body.mode
  if (typeof mode !== 'string' || !(ASSISTANT_MODES as readonly string[]).includes(mode)) {
    return { ok: false, error: 'Modo no válido.' }
  }

  let message: string | undefined
  if (body.message !== undefined && body.message !== null) {
    if (typeof body.message !== 'string') return { ok: false, error: 'El mensaje debe ser texto.' }
    if (body.message.length > LIMITS.message) return { ok: false, error: `El mensaje supera ${LIMITS.message} caracteres.` }
    message = body.message.trim() || undefined
  }
  if (mode === 'chat' && !message) return { ok: false, error: 'Escribe un mensaje.' }

  let history: HistoryMessage[] | undefined
  if (body.history !== undefined && body.history !== null) {
    if (!Array.isArray(body.history)) return { ok: false, error: 'Historial no válido.' }
    if (body.history.length > LIMITS.historyItems) return { ok: false, error: 'Historial demasiado largo.' }
    history = []
    for (const h of body.history) {
      if (!isObject(h) || (h.role !== 'user' && h.role !== 'assistant') || typeof h.content !== 'string') {
        return { ok: false, error: 'Historial no válido.' }
      }
      if (h.content.length > LIMITS.historyContent) return { ok: false, error: 'Un mensaje del historial es demasiado largo.' }
      if (h.content.trim()) history.push({ role: h.role, content: h.content })
    }
  }

  if (!isObject(body.context)) return { ok: false, error: 'Falta el contexto.' }
  let ctxSize: number
  try {
    ctxSize = JSON.stringify(body.context).length
  } catch {
    return { ok: false, error: 'Contexto no serializable.' }
  }
  if (ctxSize > LIMITS.contextChars) return { ok: false, error: 'El contexto es demasiado grande.' }

  let taskId: string | undefined
  if (body.taskId !== undefined && body.taskId !== null) {
    if (typeof body.taskId !== 'string' || !body.taskId || body.taskId.length > LIMITS.taskId) {
      return { ok: false, error: 'taskId no válido.' }
    }
    taskId = body.taskId
  }
  if ((mode === 'breakdown' || mode === 'unblock') && !taskId) {
    return { ok: false, error: 'Elige una tarea.' }
  }

  return {
    ok: true,
    value: {
      mode: mode as AssistantMode,
      message,
      history,
      context: body.context as unknown as AssistantContext,
      taskId,
    },
  }
}

/** IDs de tareas presentes en el contexto (lectura defensiva: el contexto viene del cliente). */
export function contextTaskIds(context: unknown): Set<string> {
  const ids = new Set<string>()
  if (!isObject(context)) return ids
  if (Array.isArray(context.tasks)) {
    for (const t of context.tasks) if (isObject(t) && typeof t.id === 'string') ids.add(t.id)
  }
  if (isObject(context.focusTask) && typeof context.focusTask.id === 'string') ids.add(context.focusTask.id)
  return ids
}

/* ───────────────────────── Salida del modelo ───────────────────────── */

/** Extrae el primer objeto JSON de la respuesta (tolera ```json …``` y texto alrededor). */
export function extractJson(raw: string): unknown {
  if (typeof raw !== 'string') return null
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  try {
    return JSON.parse(s)
  } catch {
    const a = s.indexOf('{')
    const b = s.lastIndexOf('}')
    if (a === -1 || b <= a) return null
    try {
      return JSON.parse(s.slice(a, b + 1))
    } catch {
      return null
    }
  }
}

function toMinutes(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === 'string' ? Number(v.replace(/[^\d.]/g, '')) : typeof v === 'number' ? v : NaN
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.max(min, Math.min(max, Math.round(n)))
}

/**
 * Plan del día. Bloques con `taskId` desconocido se DESCARTAN (probable tarea
 * inventada); los bloques sin taskId (pausas, revisión) se conservan.
 */
export function parsePlan(raw: string, knownIds: Set<string>): Plan | null {
  const data = extractJson(raw)
  if (!isObject(data)) return null
  const summary = typeof data.summary === 'string' ? clean(data.summary, 600) : ''
  const rawBlocks = Array.isArray(data.blocks) ? data.blocks : []
  const blocks: PlanBlock[] = []
  const seen = new Set<string>()
  for (const b of rawBlocks) {
    if (!isObject(b)) continue
    const title = typeof b.title === 'string' ? clean(b.title, LIMITS.stepTitle) : ''
    if (!title) continue
    let taskId: string | undefined
    if (typeof b.taskId === 'string' && b.taskId.trim()) {
      const id = b.taskId.trim()
      if (!knownIds.has(id) || seen.has(id)) continue
      seen.add(id)
      taskId = id
    }
    const minutes = toMinutes(b.minutes, 5, 240) ?? 25
    const why = typeof b.why === 'string' ? clean(b.why, 220) : ''
    blocks.push(taskId ? { taskId, title, minutes, why } : { title, minutes, why })
    if (blocks.length >= LIMITS.planBlocks) break
  }
  if (!blocks.length && !summary) return null
  return { summary, blocks }
}

/** Pasos para dividir una tarea: 3–8, títulos ≤ 120 caracteres. */
export function parseBreakdown(raw: string): Breakdown | null {
  const data = extractJson(raw)
  if (!isObject(data)) return null
  const list = Array.isArray(data.steps) ? data.steps : []
  const steps: BreakdownStep[] = []
  const seen = new Set<string>()
  for (const s of list) {
    const title = typeof s === 'string' ? clean(s, LIMITS.stepTitle) : isObject(s) && typeof s.title === 'string' ? clean(s.title, LIMITS.stepTitle) : ''
    if (!title) continue
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const minutes = isObject(s) ? toMinutes(s.minutes, 1, 240) : undefined
    steps.push(minutes ? { title, minutes } : { title })
    if (steps.length >= LIMITS.breakdownMax) break
  }
  if (steps.length < LIMITS.breakdownMin) return null
  return { steps }
}

/** Texto libre: recorta y limita longitud. Vacío → null. */
export function parseText(raw: string): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!t) return null
  return t.length > LIMITS.text ? t.slice(0, LIMITS.text - 1).trimEnd() + '…' : t
}
