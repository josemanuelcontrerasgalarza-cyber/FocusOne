'use client'

import { useId, useMemo, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import { toast } from '@/lib/toast'
import type { Goal, ProjectColor } from '@/lib/kairo/types'
import { ColorPicker, FieldGroup, RadioTiles } from './Pickers'
import { fmtNum, parseNum, todayKey } from './format'

type Kind = 'measurable' | 'tasks'

/** Crear / editar un objetivo. `goal = null` → nuevo. */
export function GoalFormModal({
  open,
  goal,
  onClose,
  onSwitchToHabit,
}: {
  open: boolean
  goal: Goal | null
  onClose: () => void
  /** Solo al crear: cambia al formulario de hábito. */
  onSwitchToHabit?: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'Editar objetivo' : 'Nuevo objetivo'}
      description={goal ? undefined : 'Algo concreto que quieres lograr. Mídelo con un número o con las tareas que lo acercan.'}
    >
      <GoalForm key={goal?.id ?? 'new'} goal={goal} onDone={onClose} onSwitchToHabit={goal ? undefined : onSwitchToHabit} />
    </Modal>
  )
}

type Errors = Partial<Record<'title' | 'target' | 'current' | 'due', string>>

function GoalForm({
  goal,
  onDone,
  onSwitchToHabit,
}: {
  goal: Goal | null
  onDone: () => void
  onSwitchToHabit?: () => void
}) {
  const uid = useId()
  const ids = {
    title: `${uid}-title`,
    desc: `${uid}-desc`,
    kind: `${uid}-kind`,
    target: `${uid}-target`,
    unit: `${uid}-unit`,
    current: `${uid}-current`,
    color: `${uid}-color`,
    due: `${uid}-due`,
    project: `${uid}-project`,
  }
  const { projects, addGoal, updateGoal } = useWorkspace()
  const today = todayKey()

  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [kind, setKind] = useState<Kind>(goal ? (goal.target_value ? 'measurable' : 'tasks') : 'measurable')
  const [target, setTarget] = useState(goal?.target_value ? String(goal.target_value) : '')
  const [unit, setUnit] = useState(goal?.unit ?? '')
  const [current, setCurrent] = useState(goal ? String(goal.current_value) : '0')
  const [color, setColor] = useState<ProjectColor>(goal?.color ?? 'lime')
  const [due, setDue] = useState(goal?.due_date ?? '')
  const [projectId, setProjectId] = useState(goal?.project_id ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => p.status !== 'archived' || p.id === goal?.project_id)
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [projects, goal?.project_id],
  )

  const errors: Errors = useMemo(() => {
    const e: Errors = {}
    if (!title.trim()) e.title = 'Ponle un nombre a tu objetivo.'
    else if (title.trim().length > 160) e.title = 'Máximo 160 caracteres.'
    if (kind === 'measurable') {
      const t = parseNum(target)
      const c = parseNum(current || '0')
      if (!Number.isFinite(t) || t <= 0) e.target = 'Indica una meta mayor que 0.'
      if (!Number.isFinite(c) || c < 0) e.current = 'Escribe un número de 0 en adelante.'
      else if (!goal && Number.isFinite(t) && t > 0 && c >= t) e.current = 'Ya llegaste a esa meta: súbela un poco.'
    }
    // Fechas pasadas: solo se permiten si ya estaban (al editar un objetivo vencido).
    if (due && due < today && due !== goal?.due_date) e.due = 'Elige una fecha de hoy en adelante.'
    return e
  }, [title, kind, target, current, due, today, goal])

  const shown = (k: keyof Errors) => (submitted ? errors[k] : undefined)

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length) {
      const first = (['title', 'target', 'current', 'due'] as const).find((k) => errors[k])
      const map = { title: ids.title, target: ids.target, current: ids.current, due: ids.due }
      if (first) document.getElementById(map[first])?.focus()
      return
    }
    setBusy(true)
    const measurable = kind === 'measurable'
    const targetValue = measurable ? parseNum(target) : null
    const currentValue = measurable ? parseNum(current || '0') : goal?.current_value ?? 0
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      color,
      target_value: targetValue,
      unit: measurable ? unit.trim() || null : null,
      current_value: currentValue,
      due_date: due || null,
      project_id: projectId || null,
    }
    try {
      if (goal) {
        const reached = goal.status === 'active' && targetValue != null && currentValue >= targetValue
        const before = useWorkspace.getState().goals.find((g) => g.id === goal.id)
        await updateGoal(goal.id, {
          ...payload,
          ...(reached ? { status: 'achieved', achieved_at: new Date().toISOString() } : {}),
        })
        // Si falló, el store restauró el objeto anterior (y ya avisó del error).
        const saved = useWorkspace.getState().goals.find((g) => g.id === goal.id)
        if (!saved || saved === before) return
        if (reached && saved.status === 'achieved') toast.success(`Objetivo cumplido: ${payload.title}`)
        onDone()
      } else {
        const created = await addGoal(payload)
        if (created) onDone()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Título" htmlFor={ids.title} error={shown('title')}>
        <input
          id={ids.title}
          className={clsx('k-input', shown('title') && 'border-danger/60')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Leer 12 libros este año"
          maxLength={160}
          autoComplete="off"
          aria-invalid={Boolean(shown('title'))}
          data-autofocus
        />
      </Field>

      <Field label="Descripción" htmlFor={ids.desc} hint="Opcional. Por qué te importa o cómo sabrás que lo lograste.">
        <textarea
          id={ids.desc}
          className="k-input min-h-[68px] resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </Field>

      <FieldGroup id={ids.kind} label="Cómo mides el avance">
        <RadioTiles<Kind>
          labelledBy={ids.kind}
          value={kind}
          onChange={setKind}
          className="grid gap-2 sm:grid-cols-2"
          tileClassName="px-3 py-2.5 text-sm font-medium"
          options={[
            { value: 'measurable', label: 'Medible', hint: 'Un número que vas sumando: 12 libros, 100 km.' },
            { value: 'tasks', label: 'Por tareas vinculadas', hint: 'Avanza al completar las tareas que le asignes.' },
          ]}
        />
      </FieldGroup>

      {kind === 'measurable' ? (
        <div className="grid animate-fade-in gap-3 sm:grid-cols-3">
          <Field label="Meta" htmlFor={ids.target} error={shown('target')}>
            <input
              id={ids.target}
              className={clsx('k-input font-mono', shown('target') && 'border-danger/60')}
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="12"
              aria-invalid={Boolean(shown('target'))}
            />
          </Field>
          <Field label="Unidad" htmlFor={ids.unit} hint="Opcional">
            <input
              id={ids.unit}
              className="k-input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="libros"
              maxLength={24}
              autoComplete="off"
            />
          </Field>
          <Field
            label={goal ? 'Llevas' : 'Punto de partida'}
            htmlFor={ids.current}
            error={shown('current')}
            hint={!goal ? 'Si ya llevas algo.' : undefined}
          >
            <input
              id={ids.current}
              className={clsx('k-input font-mono', shown('current') && 'border-danger/60')}
              inputMode="decimal"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              aria-invalid={Boolean(shown('current'))}
            />
          </Field>
        </div>
      ) : (
        <p className="animate-fade-in rounded-control border border-line bg-sunken px-3 py-2.5 text-[13px] text-ink-dim">
          Vincula tareas desde su detalle o con «Añadir tarea» en la tarjeta del objetivo. Se marca como cumplido al completar
          todas.
          {goal && goal.target_value ? (
            <span className="mt-1 block text-ink-faint">
              Tu registro actual ({fmtNum(goal.current_value)}
              {goal.unit ? ` ${goal.unit}` : ''}) se conserva por si vuelves a medirlo.
            </span>
          ) : null}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fecha objetivo" htmlFor={ids.due} error={shown('due')} hint="Opcional">
          <input
            id={ids.due}
            type="date"
            className={clsx('k-input', shown('due') && 'border-danger/60')}
            value={due}
            min={goal?.due_date && goal.due_date < today ? undefined : today}
            onChange={(e) => setDue(e.target.value)}
            aria-invalid={Boolean(shown('due'))}
          />
        </Field>
        <Field
          label="Proyecto"
          htmlFor={ids.project}
          hint={projectOptions.length ? 'Opcional' : 'Aún no tienes proyectos.'}
        >
          <select
            id={ids.project}
            className="k-input"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!projectOptions.length}
          >
            <option value="">Sin proyecto</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <FieldGroup id={ids.color} label="Color">
        <ColorPicker labelledBy={ids.color} value={color} onChange={setColor} />
      </FieldGroup>

      <div className="-mx-5 mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 pt-3">
        {onSwitchToHabit && (
          <Button variant="quiet" size="sm" className="mr-auto px-0" onClick={onSwitchToHabit}>
            ¿Es un hábito?
          </Button>
        )}
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={busy}>
          {goal ? 'Guardar' : 'Crear objetivo'}
        </Button>
      </div>
    </form>
  )
}
