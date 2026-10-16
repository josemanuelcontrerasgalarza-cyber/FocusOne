'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkspace } from '@/store/workspace'
import { toDateKey } from '@/lib/kairo/dates'
import { buildContext } from '@/lib/ai/context'
import { askAssistant, fetchAiStatus, type AiStatus } from '@/lib/ai/client'
import { localNextMove, localPlan, overdueTasks, type LocalNext, type OverdueItem } from '@/lib/ai/local'
import { LIMITS, type AssistantMode, type BreakdownStep, type HistoryMessage, type Plan } from '@/lib/ai/types'

/* ───────────────────────── Modelo de conversación ───────────────────────── */

export type ChatItem =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; kind: 'text'; text: string; mode: AssistantMode }
  | { id: string; role: 'assistant'; kind: 'plan'; plan: Plan; source: 'ai' | 'local'; appliedIds?: string[] }
  | { id: string; role: 'assistant'; kind: 'breakdown'; taskId: string; taskTitle: string; steps: BreakdownStep[]; added?: number }
  | { id: string; role: 'assistant'; kind: 'next'; data: LocalNext }
  | { id: string; role: 'assistant'; kind: 'overdue'; items: OverdueItem[] }

type AssistantItem = Extract<ChatItem, { role: 'assistant' }>

interface PendingRequest {
  mode: AssistantMode
  message?: string
  taskId?: string
  taskTitle?: string
  history?: HistoryMessage[]
}

export interface AssistantError {
  message: string
  retryable: boolean
}

const STORAGE_KEY = 'kairo:assistant:v1'
const MAX_ITEMS = 60

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

function load(): ChatItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : null
    return Array.isArray(data) ? (data as ChatItem[]).filter((x) => x && typeof x.id === 'string' && x.role) : []
  } catch {
    return []
  }
}

function save(items: ChatItem[]) {
  try {
    if (items.length) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {}
}

const clip = (s: string) => (s.length > LIMITS.historyContent ? s.slice(0, LIMITS.historyContent - 1) + '…' : s)

/** Historial compacto para el modo conversación (solo texto, últimos 10). */
function toHistory(items: ChatItem[]): HistoryMessage[] {
  const out: HistoryMessage[] = []
  for (const it of items) {
    if (it.role === 'user') out.push({ role: 'user', content: clip(it.text) })
    else if (it.kind === 'text') out.push({ role: 'assistant', content: clip(it.text) })
    else if (it.kind === 'plan')
      out.push({ role: 'assistant', content: clip(`Plan propuesto: ${it.plan.blocks.map((b) => `${b.title} (${b.minutes} min)`).join('; ')}`) })
    else if (it.kind === 'breakdown')
      out.push({ role: 'assistant', content: clip(`Pasos propuestos para "${it.taskTitle}": ${it.steps.map((s) => s.title).join('; ')}`) })
    else if (it.kind === 'next' && it.data.move)
      out.push({ role: 'assistant', content: clip(`Siguiente movimiento (motor local): ${it.data.move.title}. ${it.data.move.reasons.join('. ')}`) })
  }
  return out.slice(-LIMITS.historyItems)
}

/* ───────────────────────── Hook ───────────────────────── */

export function useAssistant() {
  const [items, setItems] = useState<ChatItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [pending, setPending] = useState<PendingRequest | null>(null)
  const [error, setError] = useState<AssistantError | null>(null)
  const [ai, setAi] = useState<AiStatus>('checking')
  const lastRequest = useRef<PendingRequest | null>(null)
  const abort = useRef<AbortController | null>(null)
  const itemsRef = useRef<ChatItem[]>([])
  itemsRef.current = items

  // Conversación de la pestaña (sessionStorage) tras montar: evita desajustes de hidratación.
  useEffect(() => {
    setItems(load())
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (hydrated) save(items)
  }, [items, hydrated])

  // Estado del servicio + conexión.
  useEffect(() => {
    let alive = true
    const check = () => fetchAiStatus().then((s) => alive && setAi(s))
    check()
    const onOffline = () => setAi('offline')
    window.addEventListener('online', check)
    window.addEventListener('offline', onOffline)
    return () => {
      alive = false
      window.removeEventListener('online', check)
      window.removeEventListener('offline', onOffline)
      abort.current?.abort()
    }
  }, [])

  const push = useCallback((...next: ChatItem[]) => setItems((prev) => [...prev, ...next].slice(-MAX_ITEMS)), [])

  const patchItem = useCallback((id: string, patch: Partial<AssistantItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? ({ ...it, ...patch } as ChatItem) : it)))
  }, [])

  /* ─────────────── Funciones locales (sin IA) ─────────────── */

  const whatNow = useCallback(() => {
    const { tasks, projects } = useWorkspace.getState()
    push({ id: uid(), role: 'user', text: '¿Qué hago ahora?' }, { id: uid(), role: 'assistant', kind: 'next', data: localNextMove(tasks, projects) })
  }, [push])

  const overdue = useCallback(() => {
    const { tasks } = useWorkspace.getState()
    push(
      { id: uid(), role: 'user', text: 'Tareas vencidas' },
      { id: uid(), role: 'assistant', kind: 'overdue', items: overdueTasks(tasks, toDateKey(new Date())) },
    )
  }, [push])

  const pushLocalPlan = useCallback(() => {
    const { tasks, projects, settings } = useWorkspace.getState()
    const plan = localPlan(tasks, projects, {
      dailyGoalMinutes: settings.dailyFocusGoalMinutes,
      blockMinutes: settings.focus.focusMinutes,
    })
    push({ id: uid(), role: 'assistant', kind: 'plan', plan, source: 'local' })
  }, [push])

  /* ─────────────── IA ─────────────── */

  const execute = useCallback(
    async (req: PendingRequest) => {
      abort.current?.abort()
      const ctrl = new AbortController()
      abort.current = ctrl
      lastRequest.current = req
      setError(null)
      setPending(req)

      const ws = useWorkspace.getState()
      const context = buildContext({
        tasks: ws.tasks,
        projects: ws.projects,
        goals: ws.goals,
        habits: ws.habits,
        habitLogs: ws.habitLogs,
        sessions: ws.sessions,
        dailyFocusGoalMinutes: ws.settings.dailyFocusGoalMinutes,
        focusTaskId: req.taskId,
      })
      const res = await askAssistant(
        { mode: req.mode, message: req.message, taskId: req.taskId, context, history: req.history },
        ctrl.signal,
      )
      if (ctrl.signal.aborted) return
      setPending(null)

      if (!res.ok) {
        if (res.code === 'aborted') return
        if (res.code === 'ai_not_configured') {
          setAi('not_configured')
          if (req.mode === 'plan') pushLocalPlan()
          else setError({ message: res.message, retryable: false })
          return
        }
        if (res.code === 'offline') {
          setAi('offline')
          if (req.mode === 'plan') pushLocalPlan()
          else setError({ message: res.message, retryable: true })
          return
        }
        if (res.code === 'unauthorized') setAi('unauthorized')
        setError({ message: res.message, retryable: res.code !== 'invalid_request' && res.code !== 'unauthorized' })
        return
      }

      setAi('ready')
      const d = res.data
      if (d.mode === 'plan') push({ id: uid(), role: 'assistant', kind: 'plan', plan: d.plan, source: 'ai' })
      else if (d.mode === 'breakdown')
        push({ id: uid(), role: 'assistant', kind: 'breakdown', taskId: d.taskId, taskTitle: req.taskTitle ?? '', steps: d.breakdown.steps })
      else push({ id: uid(), role: 'assistant', kind: 'text', text: d.text, mode: d.mode })
    },
    [push, pushLocalPlan],
  )

  const send = useCallback(
    (text: string) => {
      const message = text.trim().slice(0, LIMITS.message)
      if (!message) return
      // Historial ANTES de añadir el mensaje actual (que va aparte como `message`).
      const history = toHistory(itemsRef.current)
      push({ id: uid(), role: 'user', text: message })
      void execute({ mode: 'chat', message, history })
    },
    [push, execute],
  )

  const run = useCallback(
    (mode: Exclude<AssistantMode, 'chat'>, label: string, opts?: { taskId?: string; taskTitle?: string; message?: string }) => {
      const history = mode === 'unblock' ? toHistory(itemsRef.current) : undefined
      push({ id: uid(), role: 'user', text: label })
      if (mode === 'plan' && ai !== 'ready' && ai !== 'checking') {
        pushLocalPlan()
        return
      }
      void execute({ mode, ...opts, history })
    },
    [push, execute, ai, pushLocalPlan],
  )

  const retry = useCallback(() => {
    if (lastRequest.current) void execute(lastRequest.current)
  }, [execute])

  const cancel = useCallback(() => {
    abort.current?.abort()
    setPending(null)
  }, [])

  const reset = useCallback(() => {
    abort.current?.abort()
    setPending(null)
    setError(null)
    lastRequest.current = null
    setItems([])
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  return { items, hydrated, pending, error, ai, send, run, whatNow, overdue, retry, cancel, reset, dismissError, patchItem }
}
