'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Clock3, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react'
import { KairoMark } from '@/components/brand/Logo'
import { Button, IconButton } from '@/components/ui/Button'
import { Modal, confirm } from '@/components/ui/Overlay'
import { QuizModal } from '@/components/focus/QuizModal'
import { playChime, unlockAudio } from '@/components/focus/chime'
import { minutesFor, type FocusPrefs } from '@/components/focus/storage'
import { useWorkspace } from '@/store/workspace'
import { toast } from '@/lib/toast'
import { elapsedMs, formatClock, remainingSec } from '@/lib/kairo/focusTimer'
import { nextMove, nowContext, scoreTask } from '@/lib/kairo/priority'
import { dayOf, sessionMinutes } from '@/lib/kairo/stats'
import { formatMinutes, toDateKey } from '@/lib/kairo/dates'
import type { Task } from '@/lib/kairo/types'
import { useFocusEngine } from './useFocusEngine'
import { FocusSetup, type Candidate, type SetupState } from './FocusSetup'
import { FocusStage } from './FocusStage'
import { FocusSummary } from './FocusSummary'
import { SessionHistory } from './SessionHistory'
import { buildPlan, hasLongBreak } from './plan'

const isInteractive = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  if (!t || !t.tagName) return false
  if (t.isContentEditable) return true
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].includes(t.tagName)) return true
  const role = t.getAttribute('role')
  return Boolean(role && ['button', 'radio', 'option', 'combobox', 'menuitem', 'tab', 'checkbox', 'switch'].includes(role))
}

const creditLabel = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)} min` : `${sec} s`)

export function FocusView() {
  const router = useRouter()
  const params = useSearchParams()
  const paramTask = params.get('task')

  const tasks = useWorkspace((s) => s.tasks)
  const projects = useWorkspace((s) => s.projects)
  const sessions = useWorkspace((s) => s.sessions)
  const settings = useWorkspace((s) => s.settings)
  const mode = useWorkspace((s) => s.mode)
  const userId = useWorkspace((s) => s.userId)

  const engine = useFocusEngine()
  const { timer, armed, plan, target, lastDone, prefs } = engine.state
  const now = engine.now

  /* ───────────────────────── candidatas y sugerencia ───────────────────────── */

  const { candidates, suggestion } = useMemo(() => {
    const ctx = nowContext(new Date(), projects)
    const byId = new Map(tasks.map((t) => [t.id, t]))
    const open = tasks.filter((t) => t.status !== 'completed')
    const list: Candidate[] = open
      .map((t) => {
        const parent = t.parent_id ? byId.get(t.parent_id) ?? null : null
        const sc = scoreTask(t, ctx, parent)
        return { task: t, parentTitle: parent?.title ?? null, reasons: sc.reasons, score: sc.score }
      })
      .sort((a, b) => b.score - a.score || a.task.created_at.localeCompare(b.task.created_at))
      .map(({ score: _score, ...c }) => c)
    const nm = nextMove(tasks, ctx)
    const sug = nm ? { task: nm.task, parentTitle: nm.parent?.title ?? null, reasons: nm.reasons } : null
    return { candidates: list, suggestion: sug }
  }, [tasks, projects])

  const [setup, setSetup] = useState<SetupState>(() => {
    const fromParam = paramTask && tasks.some((t) => t.id === paramTask && t.status !== 'completed') ? paramTask : null
    const taskId = fromParam ?? suggestion?.task.id ?? null
    return { mode: taskId ? 'task' : 'free', taskId, freeLabel: '' }
  })
  const updateSetup = useCallback((p: Partial<SetupState>) => setSetup((s) => ({ ...s, ...p })), [])

  // ?task=<id> llega con la página ya abierta (p. ej. desde el cajón de tarea).
  useEffect(() => {
    if (paramTask && tasks.some((t) => t.id === paramTask && t.status !== 'completed')) {
      setSetup((s) => ({ ...s, mode: 'task', taskId: paramTask }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramTask])

  const setupPlan = useMemo(() => buildPlan(prefs.preset, prefs.customMin, settings.focus), [prefs, settings.focus])

  /* ───────────────────────── derivados ───────────────────────── */

  const view: 'setup' | 'live' | 'ready' | 'summary' = timer
    ? 'live'
    : armed && plan
      ? armed.phase !== 'focus' && lastDone
        ? 'summary'
        : 'ready'
      : 'setup'

  const taskById = useCallback((id: string | null | undefined): Task | null => (id ? tasks.find((t) => t.id === id) ?? null : null), [tasks])
  const titleOf = (taskId: string | null | undefined, label: string | null | undefined) =>
    taskById(taskId)?.title ?? label ?? 'Sesión libre'

  const today = useMemo(() => {
    const key = toDateKey(new Date())
    let minutes = 0
    let count = 0
    for (const s of sessions) {
      if (dayOf(s.started_at) !== key) continue
      const m = sessionMinutes(s)
      if (m > 0) {
        minutes += m
        count++
      }
    }
    return { minutes: Math.round(minutes), sessions: count }
  }, [sessions])

  const remaining = timer ? remainingSec(timer, now) : 0

  /* ───────────────────────── acciones ───────────────────────── */

  const startFromSetup = useCallback(() => {
    const p = buildPlan(prefs.preset, prefs.customMin, settings.focus)
    let tgt: { taskId: string | null; label: string | null }
    if (setup.mode === 'task') {
      const task = candidates.find((c) => c.task.id === setup.taskId)?.task
      if (!task) return
      tgt = { taskId: task.id, label: task.title }
    } else {
      tgt = { taskId: null, label: setup.freeLabel.trim() || null }
    }
    unlockAudio()
    engine.startFocus({ cycle: 0, plan: p, target: tgt })
    if (paramTask) router.replace('/enfoque', { scroll: false })
  }, [prefs, settings.focus, setup, candidates, engine, paramTask, router])

  const onEnd = useCallback(async () => {
    const t = engine.peek().timer
    if (!t) return
    if (t.phase !== 'focus') {
      engine.reset()
      return
    }
    const sec = Math.floor(elapsedMs(t, Date.now()) / 1000)
    const ok = await confirm({
      title: '¿Terminar la sesión ahora?',
      description: `Se guardará como sesión parcial con tu tiempo real (${sec >= 60 ? formatMinutes(sec / 60) : 'menos de 1 min'}).`,
      confirmLabel: 'Terminar sesión',
    })
    if (!ok) return
    if (engine.peek().timer?.startedAt !== t.startedAt) return // terminó mientras decidías
    const saved = engine.endFocusEarly()
    toast.info(saved >= 60 ? `Guardado: ${formatMinutes(saved / 60)} de enfoque real.` : 'Sesión guardada (menos de 1 min).')
  }, [engine])

  const exit = useCallback(() => {
    const t = engine.peek().timer
    if (t && !t.pausedAt) toast.info('Tu sesión sigue en marcha.')
    router.push('/inicio')
  }, [engine, router])

  const primary = useCallback(() => {
    if (view === 'live') engine.togglePause()
    else if (view === 'ready' || view === 'summary') {
      unlockAudio()
      engine.startArmed()
    } else startFromSetup()
  }, [view, engine, startFromSetup])

  /* ───────────────────────── teclado ───────────────────────── */

  const shortcutsOn = settings.shortcuts.enabled
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (isInteractive(e.target)) return
      if (document.querySelector('[role="dialog"]')) return
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        primary()
      } else if (e.key === 'Escape' && shortcutsOn) {
        e.preventDefault()
        exit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [primary, exit, shortcutsOn])

  /* ───────────────────────── título de la pestaña ───────────────────────── */

  const baseTitle = useRef<string | null>(null)
  const ownTitle = useRef<string | null>(null)
  useEffect(() => {
    baseTitle.current = document.title
    return () => {
      if (ownTitle.current && document.title === ownTitle.current && baseTitle.current) document.title = baseTitle.current
    }
  }, [])
  const tabTitle = timer
    ? timer.pausedAt
      ? `En pausa · ${timer.phase === 'focus' ? 'Enfoque' : 'Descanso'} — Kairo`
      : `${formatClock(remaining)} · ${timer.phase === 'focus' ? 'Enfoque' : 'Descanso'} — Kairo`
    : null
  useEffect(() => {
    if (tabTitle) {
      document.title = tabTitle
      ownTitle.current = tabTitle
    } else if (ownTitle.current && document.title === ownTitle.current && baseTitle.current) {
      document.title = baseTitle.current
      ownTitle.current = null
    }
  }, [tabTitle])

  /* ───────────────────────── sonido ───────────────────────── */

  const soundOn = settings.sound.enabled
  const toggleSound = () => {
    const enabled = !soundOn
    useWorkspace.getState().updateSettings({ sound: { enabled } })
    if (enabled) playChime('break', settings.sound.volume)
  }

  /* ───────────────────────── reflexión ───────────────────────── */

  const [quizOpen, setQuizOpen] = useState(false)
  const doneTask = taskById(lastDone?.taskId)
  const canReflect = mode === 'cloud' && Boolean(userId) && doneTask?.status === 'active'

  /* ───────────────────────── render ───────────────────────── */

  let stage: React.ReactNode = null
  if (view === 'live' && timer && plan) {
    const isFocus = timer.phase === 'focus'
    const title = titleOf(timer.taskId, timer.label)
    stage = (
      <FocusStage
        mode="live"
        phase={timer.phase}
        title={title}
        progress={elapsedMs(timer, now) / (timer.durationSec * 1000)}
        remainingSec={remaining}
        paused={Boolean(timer.pausedAt)}
        endsAt={timer.pausedAt ? null : timer.startedAt + timer.pausedMs + timer.durationSec * 1000}
        sessionIndex={isFocus && hasLongBreak(plan) ? { n: (timer.cycle % plan.longEvery) + 1, of: plan.longEvery } : null}
        nextTitle={isFocus ? null : title}
        justDone={!isFocus && lastDone ? { seconds: lastDone.seconds } : null}
        onPrimary={engine.togglePause}
        onEnd={onEnd}
        onSkip={engine.skipBreak}
      />
    )
  } else if (view === 'summary' && lastDone && armed && plan) {
    stage = (
      <FocusSummary
        seconds={lastDone.seconds}
        title={titleOf(lastDone.taskId, lastDone.label)}
        task={doneTask}
        today={today}
        goalMinutes={settings.dailyFocusGoalMinutes}
        nextBreak={{ phase: armed.phase, minutes: minutesFor(armed.phase, plan) }}
        canReflect={canReflect}
        onBreak={() => {
          unlockAudio()
          engine.startArmed()
        }}
        onAgain={() => {
          unlockAudio()
          engine.focusAgain()
        }}
        onMarkDone={() => doneTask && void useWorkspace.getState().toggleTask(doneTask.id)}
        onReflect={() => setQuizOpen(true)}
        onNewSetup={engine.reset}
      />
    )
  } else if (view === 'ready' && armed && plan) {
    const tgtTask = taskById(target?.taskId)
    stage = (
      <FocusStage
        mode="ready"
        phase={armed.phase}
        title={titleOf(target?.taskId, target?.label)}
        progress={0}
        remainingSec={minutesFor(armed.phase, plan) * 60}
        paused={false}
        endsAt={null}
        sessionIndex={null}
        nextTitle={titleOf(target?.taskId, target?.label)}
        onPrimary={() => {
          // Si la tarea se completó mientras tanto, elige otra.
          if (armed.phase === 'focus' && tgtTask?.status === 'completed') engine.reset()
          else {
            unlockAudio()
            engine.startArmed()
          }
        }}
        onEnd={engine.reset}
        onChange={engine.reset}
      />
    )
  } else {
    stage = (
      <FocusSetup
        candidates={candidates}
        suggestion={suggestion}
        setup={setup}
        onSetup={updateSetup}
        prefs={prefs}
        onPrefs={(p: Partial<FocusPrefs>) => engine.setPrefs(p)}
        plan={setupPlan}
        onStart={startFromSetup}
      />
    )
  }

  const calm = view === 'live'

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/inicio" aria-label="Kairo — Inicio" className="flex items-center gap-2.5 rounded-control py-1 pr-1">
          <KairoMark className="h-6 w-6 text-ink" />
          <span className="k-eyebrow">Enfoque</span>
        </Link>
        <div className="flex items-center gap-1">
          <IconButton label={soundOn ? 'Sonido activado — silenciar' : 'Sonido desactivado — activar'} onClick={toggleSound} aria-pressed={soundOn}>
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </IconButton>
          <Link
            href="/ajustes#enfoque"
            aria-label="Preferencias de enfoque"
            title="Preferencias de enfoque"
            className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-dim transition-colors hover:bg-sunken hover:text-ink"
          >
            <SlidersHorizontal size={17} />
          </Link>
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />} onClick={exit} className="ml-1">
            Salir
          </Button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-10">{stage}</div>

      {!calm && (
        <div className="px-4 pb-16 pt-4 sm:px-8">
          <SessionHistory />
        </div>
      )}

      <Modal
        open={Boolean(engine.away)}
        onClose={engine.awayDismiss}
        title="Estuviste fuera"
        description="La sesión siguió corriendo sin que la pantalla estuviera abierta. Solo contamos el tiempo que vimos."
        size="sm"
      >
        {engine.away && (
          <div className="pb-2">
            <div className="flex items-center gap-3 rounded-control border border-line bg-surface px-3.5 py-3">
              <Clock3 size={16} className="shrink-0 text-ink-dim" aria-hidden />
              <p className="text-sm text-ink-dim">
                Tiempo visto: <span className="font-mono text-ink">{creditLabel(engine.away.creditedSec)}</span>
                <span className="text-ink-faint"> de {Math.round(engine.away.timer.durationSec / 60)} min</span>
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="primary" onClick={engine.awayRegister} disabled={engine.away.creditedSec <= 0} data-autofocus>
                Registrar {creditLabel(engine.away.creditedSec)} vistos
              </Button>
              <Button onClick={engine.awayResume}>Seguir desde ahí</Button>
              <Button variant="ghost" onClick={engine.awayDiscard}>
                Descartar
              </Button>
            </div>
            <p className="mt-3 text-xs text-ink-faint">Si cierras este aviso, la sesión queda en pausa en el último momento visto.</p>
          </div>
        )}
      </Modal>

      {doneTask && (
        <QuizModal
          open={quizOpen}
          task={{ id: doneTask.id, title: doneTask.title }}
          uid={userId}
          onClose={() => setQuizOpen(false)}
          onSaved={() => {
            const ws = useWorkspace.getState()
            ws.patchTaskLocal(doneTask.id, { status: 'completed', completed_at: new Date().toISOString() })
            ws.refreshTotals()
          }}
        />
      )}
    </div>
  )
}
