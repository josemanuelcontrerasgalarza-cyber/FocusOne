'use client'

import { useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { Check, ChevronDown, Plus, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Kbd, Segmented } from '@/components/ui/primitives'
import { useUI } from '@/store/uiStore'
import type { Task } from '@/lib/kairo/types'
import { MAX_CUSTOM, MIN_CUSTOM, type CyclePlan, type FocusPrefs, type PresetId } from '@/components/focus/storage'
import { PRESETS, buildPlan, cycleSegments, describeCycle } from './plan'
import { useWorkspace } from '@/store/workspace'

export interface Candidate {
  task: Task
  parentTitle: string | null
  reasons: string[]
}

export interface SetupState {
  mode: 'task' | 'free'
  taskId: string | null
  freeLabel: string
}

export function FocusSetup({
  candidates,
  suggestion,
  setup,
  onSetup,
  prefs,
  onPrefs,
  plan,
  onStart,
  starting,
}: {
  candidates: Candidate[]
  suggestion: Candidate | null
  setup: SetupState
  onSetup: (s: Partial<SetupState>) => void
  prefs: FocusPrefs
  onPrefs: (p: Partial<FocusPrefs>) => void
  plan: CyclePlan
  onStart: () => void
  starting?: boolean
}) {
  const selected = setup.taskId ? candidates.find((c) => c.task.id === setup.taskId) ?? null : null
  const canStart = setup.mode === 'free' || Boolean(selected)

  return (
    <section aria-labelledby="setup-title" className="mx-auto w-full max-w-xl animate-fade-in">
      <p className="k-eyebrow mb-1.5">Nueva sesión</p>
      <h1 id="setup-title" className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[32px]">
        ¿En qué te vas a enfocar?
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-dim">Una cosa a la vez. El reloj se encarga del resto.</p>

      <div className="mt-6">
        <Segmented
          label="Tipo de sesión"
          value={setup.mode}
          onChange={(mode) => onSetup({ mode })}
          options={[
            { value: 'task', label: 'Una tarea' },
            { value: 'free', label: 'Sesión libre' },
          ]}
        />
      </div>

      <div className="mt-4">
        {setup.mode === 'task' ? (
          <TaskPicker
            candidates={candidates}
            selected={selected}
            suggestionId={suggestion?.task.id ?? null}
            onSelect={(id) => onSetup({ taskId: id })}
            onFree={() => onSetup({ mode: 'free' })}
          />
        ) : (
          <div>
            <label htmlFor="focus-label" className="mb-1.5 block text-[13px] font-medium text-ink">
              ¿Qué vas a hacer? <span className="font-normal text-ink-faint">(opcional)</span>
            </label>
            <input
              id="focus-label"
              className="k-input h-11 text-[15px]"
              placeholder="Leer, escribir, estudiar…"
              maxLength={80}
              value={setup.freeLabel}
              onChange={(e) => onSetup({ freeLabel: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onStart()
              }}
            />
          </div>
        )}
      </div>

      <PresetPicker prefs={prefs} onPrefs={onPrefs} />

      <CyclePreview plan={plan} />

      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Button variant="primary" size="lg" onClick={onStart} disabled={!canStart} loading={starting} className="sm:min-w-[220px]">
          Iniciar enfoque · {plan.focusMin} min
        </Button>
        <p className="hidden items-center gap-1.5 text-xs text-ink-faint sm:inline-flex">
          o pulsa <Kbd>Espacio</Kbd>
        </p>
      </div>
    </section>
  )
}

/* ───────────────────────── selector de tarea ───────────────────────── */

function TaskPicker({
  candidates,
  selected,
  suggestionId,
  onSelect,
  onFree,
}: {
  candidates: Candidate[]
  selected: Candidate | null
  suggestionId: string | null
  onSelect: (id: string) => void
  onFree: () => void
}) {
  const openCapture = useUI((s) => s.openCapture)
  const [open, setOpen] = useState(!selected)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? candidates.filter((c) => c.task.title.toLowerCase().includes(q) || c.parentTitle?.toLowerCase().includes(q))
      : candidates
    return list.slice(0, 50)
  }, [candidates, query])

  if (!candidates.length) {
    return (
      <div className="rounded-card border border-dashed border-line-strong px-4 py-6 text-center">
        <p className="text-[15px] font-semibold text-ink">No tienes tareas abiertas</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-dim">Crea una para enfocarte en ella, o empieza una sesión libre.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" icon={<Plus size={14} />} onClick={() => openCapture()}>
            Nueva tarea
          </Button>
          <Button size="sm" variant="ghost" onClick={onFree}>
            Sesión libre
          </Button>
        </div>
      </div>
    )
  }

  const choose = (id: string) => {
    onSelect(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div>
      {selected && (
        <div className="rounded-card border border-line bg-surface px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {selected.task.id === suggestionId && (
                <p className="k-eyebrow mb-1 inline-flex items-center gap-1.5 !text-accent-fg">
                  <Sparkles size={11} aria-hidden /> Tu siguiente movimiento
                </p>
              )}
              <p className="text-[15px] font-semibold leading-snug text-ink">{selected.task.title}</p>
              <TaskSub c={selected} />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen((v) => !v)
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
              aria-expanded={open}
              aria-controls={listId}
              icon={<ChevronDown size={14} className={clsx('transition-transform', open && 'rotate-180')} />}
            >
              Cambiar
            </Button>
          </div>
        </div>
      )}

      {(open || !selected) && (
        <div className={clsx('animate-fade-in rounded-card border border-line bg-surface', selected && 'mt-2')}>
          <div className="relative border-b border-line">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={filtered[active] ? `${listId}-${filtered[active].task.id}` : undefined}
              aria-label="Buscar una tarea"
              placeholder="Buscar entre tus tareas abiertas…"
              className="h-11 w-full rounded-t-card bg-transparent pl-10 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActive((i) => Math.min(filtered.length - 1, i + 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((i) => Math.max(0, i - 1))
                } else if (e.key === 'Enter' && filtered[active]) {
                  e.preventDefault()
                  choose(filtered[active].task.id)
                } else if (e.key === 'Escape' && selected) {
                  e.stopPropagation()
                  setOpen(false)
                }
              }}
            />
          </div>
          <ul id={listId} role="listbox" aria-label="Tareas abiertas" className="max-h-72 overflow-y-auto p-1">
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-dim">Nada coincide con “{query}”.</li>}
            {filtered.map((c, i) => {
              const isSel = c.task.id === selected?.task.id
              return (
                <li
                  key={c.task.id}
                  id={`${listId}-${c.task.id}`}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(c.task.id)}
                  className={clsx(
                    'flex cursor-pointer items-start gap-3 rounded-control px-3 py-2.5',
                    i === active ? 'bg-sunken' : 'hover:bg-sunken',
                  )}
                >
                  <span
                    className={clsx(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      isSel ? 'border-accent-fg bg-accent-fg text-canvas' : 'border-line-strong',
                    )}
                    aria-hidden
                  >
                    {isSel && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-ink">{c.task.title}</span>
                    <TaskSub c={c} compact />
                  </span>
                  {c.task.id === suggestionId && (
                    <span className="mt-0.5 shrink-0 text-2xs font-medium text-accent-fg">Sugerida</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function TaskSub({ c, compact }: { c: Candidate; compact?: boolean }) {
  const project = useWorkspace((s) => (c.task.project_id ? s.projects.find((p) => p.id === c.task.project_id) : null))
  const bits = [c.parentTitle ? `En ${c.parentTitle}` : null, project?.name ?? null, ...c.reasons.slice(0, compact ? 1 : 2)].filter(
    Boolean,
  ) as string[]
  const est = c.task.estimated_minutes
  if (!bits.length && !est) return null
  return (
    <span className={clsx('block truncate text-ink-dim', compact ? 'mt-0.5 text-xs' : 'mt-1 text-[13px]')}>
      {bits.join(' · ')}
      {est ? `${bits.length ? ' · ' : ''}~${est} min` : ''}
    </span>
  )
}

/* ───────────────────────── presets ───────────────────────── */

function PresetPicker({ prefs, onPrefs }: { prefs: FocusPrefs; onPrefs: (p: Partial<FocusPrefs>) => void }) {
  const focus = useWorkspace((s) => s.settings.focus)
  const [draft, setDraft] = useState(String(prefs.customMin))
  const n = Number(draft)
  const invalid = draft.trim() === '' || !Number.isFinite(n) || n < MIN_CUSTOM || n > MAX_CUSTOM

  const meta = (id: PresetId) => {
    const p = buildPlan(id, prefs.customMin, focus)
    return `${p.focusMin} · ${p.shortMin}`
  }

  return (
    <fieldset className="mt-7">
      <legend className="mb-2 flex w-full items-center justify-between text-[13px] font-medium text-ink">
        Ritmo
        <Link href="/ajustes#enfoque" className="text-xs font-normal text-ink-faint underline-offset-2 hover:text-ink-dim hover:underline">
          Ajustar Pomodoro en Preferencias
        </Link>
      </legend>
      <div role="radiogroup" aria-label="Ritmo de la sesión" className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => {
          const on = prefs.preset === p.id
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              title={p.hint}
              onClick={() => onPrefs({ preset: p.id })}
              className={clsx(
                'flex flex-col items-start rounded-control border px-3 py-2.5 text-left transition-colors',
                on ? 'border-accent-fg/50 bg-accent/10' : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <span className="text-[13px] font-medium text-ink">{p.name}</span>
              <span className="mt-0.5 font-mono text-xs text-ink-dim">
                {p.id === 'custom' && !on ? 'a medida' : meta(p.id)}
              </span>
            </button>
          )
        })}
      </div>
      {prefs.preset === 'custom' && (
        <div className="mt-3 flex animate-fade-in flex-wrap items-center gap-3">
          <label htmlFor="focus-custom" className="text-[13px] text-ink-dim">
            Minutos de enfoque
          </label>
          <input
            id="focus-custom"
            type="number"
            inputMode="numeric"
            min={MIN_CUSTOM}
            max={MAX_CUSTOM}
            step={5}
            className="k-input h-9 w-24 font-mono"
            value={draft}
            aria-invalid={invalid}
            aria-describedby="focus-custom-hint"
            onChange={(e) => {
              setDraft(e.target.value)
              const v = Number(e.target.value)
              if (Number.isFinite(v) && v >= MIN_CUSTOM && v <= MAX_CUSTOM) onPrefs({ customMin: Math.round(v) })
            }}
            onBlur={() => setDraft(String(prefs.customMin))}
          />
          <span id="focus-custom-hint" className={clsx('text-xs', invalid ? 'text-danger' : 'text-ink-faint')}>
            Entre {MIN_CUSTOM} y {MAX_CUSTOM} min
          </span>
        </div>
      )}
    </fieldset>
  )
}

/* ───────────────────────── ciclo ───────────────────────── */

function CyclePreview({ plan }: { plan: CyclePlan }) {
  const segs = cycleSegments(plan)
  return (
    <div className="mt-6">
      <p className="k-eyebrow mb-2">Tu ciclo</p>
      <div className="flex h-2 gap-1" aria-hidden>
        {segs.map((s, i) => (
          <span
            key={i}
            className={clsx(
              'rounded-full',
              s.kind === 'focus' ? 'bg-accent-fg' : s.kind === 'long' ? 'bg-ink-faint/60' : 'bg-line-strong',
            )}
            style={{ flexGrow: s.min, flexBasis: 0 }}
          />
        ))}
      </div>
      <p className="mt-2 text-[13px] text-ink-dim">{describeCycle(plan)}</p>
    </div>
  )
}
