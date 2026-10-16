'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CalendarDays, Clock, Flag, Repeat, Hash, FolderKanban, Timer, CornerDownLeft } from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { Modal } from '@/components/ui/Overlay'
import { Kbd } from '@/components/ui/primitives'
import { parseQuickTask } from '@/lib/kairo/parse'
import { relativeDayLabel, toDateKey, formatMinutes } from '@/lib/kairo/dates'
import { PRIORITY_META } from '@/lib/kairo/tasks'
import { RECURRENCE_LABEL } from '@/lib/kairo/recurrence'
import type { TaskInput } from '@/lib/kairo/types'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Lógica compartida: texto → tarea estructurada (+ proyecto por nombre). */
export function useQuickAdd(defaults?: Partial<TaskInput> | null) {
  const [text, setText] = useState('')
  const { projects, addTask, addProject } = useWorkspace()
  const today = toDateKey(new Date())
  const parsed = useMemo(() => parseQuickTask(text), [text])
  const matchedProject = useMemo(() => {
    if (!parsed.projectHint) return null
    const h = norm(parsed.projectHint)
    return (
      projects.find((p) => norm(p.name) === h) ??
      projects.find((p) => norm(p.name).replace(/\s+/g, '').startsWith(h)) ??
      null
    )
  }, [parsed.projectHint, projects])

  async function submit(): Promise<boolean> {
    const title = parsed.title || text.trim()
    if (!title) return false
    let projectId = matchedProject?.id ?? defaults?.project_id ?? null
    if (parsed.projectHint && !matchedProject) {
      const p = await addProject({ name: parsed.projectHint })
      projectId = p?.id ?? null
    }
    const t = await addTask({
      ...defaults,
      title,
      due_date: parsed.due_date ?? defaults?.due_date ?? null,
      due_time: parsed.due_time,
      estimated_minutes: parsed.estimated_minutes,
      priority: parsed.priority ?? defaults?.priority ?? 2,
      tags: parsed.tags,
      recurrence: parsed.recurrence,
      project_id: projectId,
    })
    if (t) setText('')
    return Boolean(t)
  }

  return { text, setText, parsed, matchedProject, submit, today }
}

/** Fichas con lo que se ha entendido del texto. */
export function ParsePreview({
  parsed,
  matchedProjectName,
  today,
}: {
  parsed: ReturnType<typeof parseQuickTask>
  matchedProjectName: string | null
  today: string
}) {
  const chips: { icon: React.ReactNode; text: string; tone?: string }[] = []
  if (parsed.due_date) chips.push({ icon: <CalendarDays size={12} />, text: relativeDayLabel(parsed.due_date, today) })
  if (parsed.due_time) chips.push({ icon: <Clock size={12} />, text: parsed.due_time })
  if (parsed.estimated_minutes) chips.push({ icon: <Timer size={12} />, text: formatMinutes(parsed.estimated_minutes) })
  if (parsed.priority && parsed.priority >= 3) chips.push({ icon: <Flag size={12} />, text: PRIORITY_META[parsed.priority].label })
  if (parsed.recurrence) chips.push({ icon: <Repeat size={12} />, text: RECURRENCE_LABEL[parsed.recurrence] })
  for (const t of parsed.tags) chips.push({ icon: <Hash size={12} />, text: t })
  if (parsed.projectHint)
    chips.push({
      icon: <FolderKanban size={12} />,
      text: matchedProjectName ?? `${parsed.projectHint} (nuevo proyecto)`,
    })
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap gap-1.5" aria-live="polite">
      {chips.map((c, i) => (
        <span
          key={i}
          className={clsx('inline-flex items-center gap-1 rounded-md border border-accent-fg/20 bg-accent/10 px-1.5 py-0.5 text-xs text-accent-fg', c.tone)}
        >
          {c.icon}
          {c.text}
        </span>
      ))}
    </div>
  )
}

/** Modal global de captura rápida (atajo N). */
export function QuickCaptureHost() {
  const { captureOpen, captureDefaults, closeCapture } = useUI()
  return (
    <Modal open={captureOpen} onClose={closeCapture} size="md">
      {captureOpen && <CaptureForm defaults={captureDefaults} onDone={closeCapture} />}
    </Modal>
  )
}

function CaptureForm({ defaults, onDone }: { defaults: Partial<TaskInput> | null; onDone: () => void }) {
  const { text, setText, parsed, matchedProject, submit, today } = useQuickAdd(defaults)
  const [busy, setBusy] = useState(false)
  const [keepOpen, setKeepOpen] = useState(false)

  async function go(e?: React.FormEvent) {
    e?.preventDefault()
    if (busy) return
    setBusy(true)
    const ok = await submit()
    setBusy(false)
    if (ok && !keepOpen) onDone()
  }

  return (
    <form onSubmit={go} className="space-y-3 pb-1">
      <div>
        <p className="k-eyebrow mb-2">Nueva tarea</p>
        <input
          data-autofocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Estudiar ciencias mañana durante 30 minutos"
          aria-label="Describe la tarea"
          className="w-full bg-transparent text-lg font-medium text-ink outline-none placeholder:text-ink-faint"
          maxLength={300}
        />
        {parsed.title && parsed.title !== text.trim() && (
          <p className="mt-1 text-sm text-ink-dim">
            Título: <span className="text-ink">{parsed.title}</span>
          </p>
        )}
      </div>
      <ParsePreview parsed={parsed} matchedProjectName={matchedProject?.name ?? null} today={today} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p className="text-xs text-ink-faint">
          Prueba: <span className="text-ink-dim">«mañana a las 5»</span>, <span className="text-ink-dim">«30 min»</span>,{' '}
          <span className="text-ink-dim">«urgente»</span>, <span className="text-ink-dim">#etiqueta</span>,{' '}
          <span className="text-ink-dim">@proyecto</span>, <span className="text-ink-dim">«cada lunes»</span>
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-ink-dim">
            <input type="checkbox" checked={keepOpen} onChange={(e) => setKeepOpen(e.target.checked)} className="accent-[rgb(var(--accent-fg))]" />
            Crear otra
          </label>
          <button
            type="submit"
            disabled={!text.trim() || busy}
            className="inline-flex h-9 items-center gap-2 rounded-control bg-accent px-3.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Añadir <Kbd><CornerDownLeft size={10} /></Kbd>
          </button>
        </div>
      </div>
    </form>
  )
}

/** Barra de captura en línea (Inicio, Tareas, Proyecto). */
export function QuickAddBar({
  defaults,
  placeholder = 'Añade una tarea… (p. ej. «Llamar a Ana el lunes a las 5 #trabajo»)',
  className,
}: {
  defaults?: Partial<TaskInput>
  placeholder?: string
  className?: string
}) {
  const { text, setText, parsed, matchedProject, submit, today } = useQuickAdd(defaults)
  const [busy, setBusy] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (busy) return
        setBusy(true)
        await submit()
        setBusy(false)
      }}
      className={clsx('rounded-card border border-line bg-surface px-3.5 py-2.5 transition-colors focus-within:border-line-strong', className)}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-ink-faint" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label="Añadir tarea"
          maxLength={300}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
        />
        {text.trim() && (
          <button type="submit" disabled={busy} className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink disabled:opacity-50">
            Añadir
          </button>
        )}
      </div>
      {text.trim() && (
        <div className="mt-2 pl-7">
          <ParsePreview parsed={parsed} matchedProjectName={matchedProject?.name ?? null} today={today} />
        </div>
      )}
    </form>
  )
}
