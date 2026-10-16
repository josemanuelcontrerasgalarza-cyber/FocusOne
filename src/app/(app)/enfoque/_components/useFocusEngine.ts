'use client'

/**
 * Motor del modo Enfoque: temporizador por RELOJ DE PARED (lib/kairo/focusTimer),
 * persistido en localStorage y honesto con las recargas:
 *
 * - Mientras la página está abierta, cada ~5 s se registra un latido.
 * - Al volver (montaje, pestaña visible, pestaña reanudada) se llama a
 *   `reconcile()`: si hubo un hueco largo sin latidos, solo se acredita el
 *   tiempo visto y se pregunta qué hacer ("Estuviste fuera"). Una recarga
 *   nunca convierte una sesión inacabada en completa.
 * - Las sesiones de ENFOQUE se registran en el servidor (los descansos no).
 *   Los resultados pasan por una bandeja de salida persistente: si falla la
 *   red, se reintenta al volver.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  elapsedMs,
  nextPhase,
  pause as pauseTimer,
  reconcile,
  resume as resumeTimer,
  type Phase,
  type TimerState,
} from '@/lib/kairo/focusTimer'
import { useWorkspace } from '@/store/workspace'
import { playChime } from '@/components/focus/chime'
import {
  BEAT_MS,
  FOCUS_KEY,
  minutesFor,
  readFocus,
  writeFocus,
  type CyclePlan,
  type FocusPersisted,
  type FocusPrefs,
  type FocusTarget,
  type OutboxItem,
} from '@/components/focus/storage'

/** Hueco máximo entre latidos para considerar que seguías aquí. */
const GAP_MS = 90_000

export interface AwayInfo {
  timer: TimerState
  creditedSec: number
}

function makeTimer(phase: Phase, cycle: number, plan: CyclePlan, target: FocusTarget, startedAt: number, now: number): TimerState {
  return {
    phase,
    startedAt,
    durationSec: Math.max(60, Math.round(minutesFor(phase, plan) * 60)),
    pausedAt: null,
    pausedMs: 0,
    lastBeat: now,
    taskId: target.taskId,
    label: target.label,
    sessionId: null,
    cycle,
  }
}

/** Momento real en que termina (o terminó) un temporizador que no está en pausa. */
const endOf = (t: TimerState) => t.startedAt + t.pausedMs + t.durationSec * 1000

export function useFocusEngine() {
  const [state, setState] = useState<FocusPersisted>(() => readFocus())
  const ref = useRef(state)
  const [now, setNow] = useState(() => Date.now())
  const [away, setAway] = useState<AwayInfo | null>(null)
  const awayRef = useRef<AwayInfo | null>(null)
  awayRef.current = away

  const pendingStarts = useRef(new Map<number, Promise<string | null>>())
  const flushing = useRef(false)

  const commit = useCallback((update: (s: FocusPersisted) => FocusPersisted) => {
    const next = update(ref.current)
    if (next === ref.current) return
    ref.current = next
    writeFocus(next)
    setState(next)
  }, [])

  /* ───────────────────────── registro en el servidor ───────────────────────── */

  const ensureSessionId = useCallback(async (item: OutboxItem): Promise<string | null> => {
    if (item.sessionId) return item.sessionId
    const pending = pendingStarts.current.get(item.startedAt)
    if (pending) {
      const id = await pending
      if (id) return id
    }
    const ws = useWorkspace.getState()
    // ¿Ya existe la fila (p. ej. creada antes de recargar)?
    const existing = ws.sessions.find((s) => Math.abs(new Date(s.started_at).getTime() - item.startedAt) < 1000)
    if (existing) return existing.id
    // Descartada y sin fila: no hay nada que guardar.
    if (item.seconds <= 0 && !item.completed) return null
    const row = await ws.startSession({
      task_id: item.taskId,
      planned_minutes: item.plannedMin,
      label: item.label,
      started_at: new Date(item.startedAt).toISOString(),
    })
    return row?.id ?? null
  }, [])

  const flush = useCallback(async () => {
    if (flushing.current) return
    flushing.current = true
    try {
      while (ref.current.outbox.length) {
        const item = ref.current.outbox[0]
        const id = await ensureSessionId(item)
        if (!id) {
          if (item.seconds <= 0 && !item.completed) {
            commit((s) => ({ ...s, outbox: s.outbox.filter((o) => o.startedAt !== item.startedAt) }))
            continue
          }
          break // sin red: se reintenta más tarde
        }
        const ended_at = new Date(item.endedAt).toISOString()
        await useWorkspace.getState().finishSession(id, { ended_at, actual_seconds: item.seconds, completed: item.completed })
        const saved = useWorkspace.getState().sessions.find((s) => s.id === id)
        if (!saved || saved.ended_at !== ended_at) break // falló (el store ya avisó)
        commit((s) => ({ ...s, outbox: s.outbox.filter((o) => o.startedAt !== item.startedAt) }))
      }
    } finally {
      flushing.current = false
    }
  }, [commit, ensureSessionId])

  const record = useCallback(
    (t: TimerState, plan: CyclePlan, r: { seconds: number; completed: boolean; endedAt: number }) => {
      const item: OutboxItem = {
        startedAt: t.startedAt,
        sessionId: t.sessionId,
        taskId: t.taskId,
        label: t.label,
        plannedMin: plan.focusMin,
        endedAt: r.endedAt,
        seconds: Math.max(0, Math.min(t.durationSec, Math.floor(r.seconds))),
        completed: r.completed,
      }
      commit((s) => ({ ...s, outbox: [...s.outbox.filter((o) => o.startedAt !== item.startedAt), item] }))
      void flush()
    },
    [commit, flush],
  )

  /* ───────────────────────── transiciones ───────────────────────── */

  const startFocus = useCallback(
    (opts: { cycle: number; plan?: CyclePlan; target?: FocusTarget; at?: number }) => {
      const s = ref.current
      const plan = opts.plan ?? s.plan
      const target = opts.target ?? s.target ?? { taskId: null, label: null }
      if (!plan) return
      const n = Date.now()
      const startedAt = opts.at ?? n
      const timer = makeTimer('focus', opts.cycle, plan, target, startedAt, n)
      commit((x) => ({ ...x, plan, target, timer, armed: null, lastDone: null }))

      const ws = useWorkspace.getState()
      const p = ws
        .startSession({
          task_id: target.taskId,
          planned_minutes: plan.focusMin,
          label: target.label,
          started_at: new Date(startedAt).toISOString(),
        })
        .then((row) => row?.id ?? null)
      pendingStarts.current.set(startedAt, p)
      void p.then((id) => {
        pendingStarts.current.delete(startedAt)
        if (!id) return
        commit((x) => ({
          ...x,
          timer: x.timer && x.timer.startedAt === startedAt ? { ...x.timer, sessionId: id } : x.timer,
          outbox: x.outbox.map((o) => (o.startedAt === startedAt && !o.sessionId ? { ...o, sessionId: id } : o)),
        }))
      })

      if (target.taskId) {
        const task = ws.tasks.find((t) => t.id === target.taskId)
        if (task && task.status !== 'active' && task.status !== 'completed') void ws.setTaskStatus(task.id, 'active')
      }
    },
    [commit],
  )

  const startBreak = useCallback(
    (phase: Phase, cycle: number) => {
      const s = ref.current
      if (!s.plan) return
      const n = Date.now()
      const timer = makeTimer(phase, cycle, s.plan, s.target ?? { taskId: null, label: null }, n, n)
      commit((x) => ({ ...x, timer, armed: null }))
    },
    [commit],
  )

  const chime = useCallback((kind: 'focus' | 'break') => {
    const { sound } = useWorkspace.getState().settings
    if (sound.enabled) playChime(kind, sound.volume)
  }, [])

  /** Fase terminada de forma natural. `live`: ocurrió con la pantalla delante. */
  const completePhase = useCallback(
    (t: TimerState, live: boolean) => {
      const s = ref.current
      const plan = s.plan
      if (!plan) return
      const endAt = endOf(t)
      const auto = useWorkspace.getState().settings.focus
      const np = nextPhase(t, plan.longEvery)
      if (t.phase === 'focus') {
        record(t, plan, { seconds: t.durationSec, completed: true, endedAt: endAt })
        const lastDone = { taskId: t.taskId, label: t.label, seconds: t.durationSec, endedAt: endAt }
        if (live && auto.autoStartBreaks) {
          const n = Date.now()
          const timer = makeTimer(np.phase, np.cycle, plan, s.target ?? { taskId: t.taskId, label: t.label }, endAt, n)
          commit((x) => ({ ...x, timer, armed: null, lastDone }))
        } else {
          commit((x) => ({ ...x, timer: null, armed: np, lastDone }))
        }
        if (live) chime('focus')
      } else {
        if (live && auto.autoStartFocus) startFocus({ cycle: np.cycle, at: endAt })
        else commit((x) => ({ ...x, timer: null, armed: np }))
        if (live) chime('break')
      }
    },
    [chime, commit, record, startFocus],
  )

  /** Revisa el temporizador contra el reloj y actúa. */
  const settle = useCallback(
    (origin: 'restore' | 'tick' | 'visible') => {
      const t = ref.current.timer
      if (!t || awayRef.current) return
      const n = Date.now()
      const r = reconcile(t, n, GAP_MS)
      if (r.kind === 'paused') return
      if (r.kind === 'running') {
        if (n - t.lastBeat >= BEAT_MS || origin !== 'tick') {
          commit((x) => (x.timer && x.timer.startedAt === t.startedAt ? { ...x, timer: { ...x.timer, lastBeat: n } } : x))
        }
        return
      }
      if (r.kind === 'finished') {
        const live = origin !== 'restore' && n - endOf(t) < GAP_MS
        completePhase(t, live)
        return
      }
      // away: hubo un hueco sin latidos.
      if (t.phase !== 'focus') {
        // Los descansos no se registran: simplemente terminan.
        const plan = ref.current.plan
        const np = nextPhase(t, plan?.longEvery ?? 4)
        commit((x) => ({ ...x, timer: null, armed: np }))
        return
      }
      // Queda en pausa en el último momento visto, y se pregunta qué hacer.
      const paused: TimerState = { ...t, pausedAt: Math.max(t.startedAt, t.lastBeat) }
      commit((x) => ({ ...x, timer: paused }))
      setAway({ timer: paused, creditedSec: r.creditedSec })
    },
    [commit, completePhase],
  )

  /* ───────────────────────── efectos ───────────────────────── */

  // Al montar: reconciliar y vaciar la bandeja de salida pendiente.
  useEffect(() => {
    settle('restore')
    void flush()
    const onVisible = () => {
      if (document.visibilityState === 'visible') settle('visible')
    }
    const onOnline = () => void flush()
    const onStorage = (e: StorageEvent) => {
      if (e.key !== FOCUS_KEY) return
      // Otra pestaña cambió el estado: adoptarlo.
      const next = readFocus()
      ref.current = next
      setState(next)
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onVisible)
    window.addEventListener('online', onOnline)
    window.addEventListener('storage', onStorage)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('storage', onStorage)
    }
  }, [settle, flush])

  // Tic del reloj (solo con el temporizador en marcha). El latido viaja en el tic.
  const running = Boolean(state.timer && !state.timer.pausedAt)
  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const id = window.setInterval(() => {
      setNow(Date.now())
      settle('tick')
    }, 250)
    return () => window.clearInterval(id)
  }, [running, settle])

  /* ───────────────────────── acciones públicas ───────────────────────── */

  const togglePause = useCallback(() => {
    const t = ref.current.timer
    if (!t) return
    const n = Date.now()
    commit((x) => ({ ...x, timer: t.pausedAt ? resumeTimer(t, n) : pauseTimer(t, n) }))
    setNow(n)
  }, [commit])

  /** Termina un ENFOQUE antes de tiempo: guarda el tiempo real como parcial. */
  const endFocusEarly = useCallback((): number => {
    const s = ref.current
    const t = s.timer
    if (!t || t.phase !== 'focus' || !s.plan) return 0
    const n = Date.now()
    const seconds = Math.floor(elapsedMs(t, n) / 1000)
    record(t, s.plan, { seconds, completed: false, endedAt: t.pausedAt ?? n })
    commit((x) => ({ ...x, timer: null, armed: null, lastDone: null }))
    return seconds
  }, [commit, record])

  const skipBreak = useCallback(() => {
    const s = ref.current
    const t = s.timer
    if (!t || t.phase === 'focus' || !s.plan) return
    startFocus({ cycle: nextPhase(t, s.plan.longEvery).cycle })
  }, [startFocus])

  /** Cierra el ciclo (desde un descanso o una fase preparada) sin registrar nada. */
  const reset = useCallback(() => {
    commit((x) => ({ ...x, timer: null, armed: null, lastDone: null }))
  }, [commit])

  /** Desde la fase preparada: empieza lo que toca. */
  const startArmed = useCallback(() => {
    const s = ref.current
    if (!s.armed || s.timer) return
    if (s.armed.phase === 'focus') startFocus({ cycle: s.armed.cycle })
    else startBreak(s.armed.phase, s.armed.cycle)
  }, [startBreak, startFocus])

  /** Desde el resumen: salta el descanso preparado y vuelve a enfocarse. */
  const focusAgain = useCallback(() => {
    const s = ref.current
    if (!s.plan || s.timer) return
    const cycle = s.armed ? nextPhase(s.armed, s.plan.longEvery).cycle : 0
    startFocus({ cycle })
  }, [startFocus])

  /* ── "Estuviste fuera" ── */

  const awayRegister = useCallback(() => {
    const a = awayRef.current
    const s = ref.current
    if (!a || !s.plan) return
    record(a.timer, s.plan, { seconds: a.creditedSec, completed: false, endedAt: a.timer.pausedAt ?? a.timer.lastBeat })
    commit((x) => ({ ...x, timer: null, armed: null, lastDone: null }))
    setAway(null)
  }, [commit, record])

  const awayDiscard = useCallback(() => {
    const a = awayRef.current
    const s = ref.current
    if (!a || !s.plan) return
    // La fila ya pudo crearse al empezar: se cierra con 0 s (no cuenta).
    record(a.timer, s.plan, { seconds: 0, completed: false, endedAt: a.timer.pausedAt ?? a.timer.lastBeat })
    commit((x) => ({ ...x, timer: null, armed: null, lastDone: null }))
    setAway(null)
  }, [commit, record])

  /** Sigue desde donde lo dejaste: el tiempo fuera no cuenta. */
  const awayResume = useCallback(() => {
    const t = ref.current.timer
    if (t) commit((x) => ({ ...x, timer: resumeTimer(t, Date.now()) }))
    setAway(null)
  }, [commit])

  /** Cerrar el aviso sin decidir: queda en pausa en el último momento visto. */
  const awayDismiss = useCallback(() => setAway(null), [])

  const setPrefs = useCallback(
    (p: Partial<FocusPrefs>) => commit((x) => ({ ...x, prefs: { ...x.prefs, ...p } })),
    [commit],
  )

  const peek = useCallback(() => ref.current, [])

  return {
    state,
    peek,
    now: running ? now : Date.now(),
    away,
    startFocus,
    startArmed,
    focusAgain,
    togglePause,
    endFocusEarly,
    skipBreak,
    reset,
    awayRegister,
    awayDiscard,
    awayResume,
    awayDismiss,
    setPrefs,
  }
}

export type FocusEngine = ReturnType<typeof useFocusEngine>
