'use client'

import { useId, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Field, Segmented } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import type { Habit, ProjectColor } from '@/lib/kairo/types'
import { ColorPicker, FieldGroup, RadioTiles } from './Pickers'
import { HABIT_ICONS } from './format'

/** Crear / editar un hábito. `habit = null` → nuevo. */
export function HabitFormModal({
  open,
  habit,
  onClose,
  onSwitchToGoal,
}: {
  open: boolean
  habit: Habit | null
  onClose: () => void
  /** Solo al crear: cambia al formulario de objetivo. */
  onSwitchToGoal?: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? 'Editar hábito' : 'Nuevo hábito'}
      description={habit ? undefined : 'Algo pequeño que quieres repetir. Lo marcas en un toque y ves cómo se acumula.'}
    >
      <HabitForm key={habit?.id ?? 'new'} habit={habit} onDone={onClose} onSwitchToGoal={habit ? undefined : onSwitchToGoal} />
    </Modal>
  )
}

const DAYS = ['1', '2', '3', '4', '5', '6', '7'] as const
type Days = (typeof DAYS)[number]

function HabitForm({
  habit,
  onDone,
  onSwitchToGoal,
}: {
  habit: Habit | null
  onDone: () => void
  onSwitchToGoal?: () => void
}) {
  const uid = useId()
  const ids = { title: `${uid}-title`, icon: `${uid}-icon`, color: `${uid}-color`, days: `${uid}-days` }
  const { addHabit, updateHabit } = useWorkspace()

  const initialIcon = habit?.icon && habit.icon !== '•' ? habit.icon : HABIT_ICONS[0]
  const [title, setTitle] = useState(habit?.title ?? '')
  const [icon, setIcon] = useState<string>(initialIcon)
  const [color, setColor] = useState<ProjectColor>(habit?.color ?? 'lime')
  const [days, setDays] = useState<Days>(String(Math.min(7, Math.max(1, habit?.target_per_week ?? 7))) as Days)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  const titleError = !title.trim()
    ? 'Ponle un nombre a tu hábito.'
    : title.trim().length > 120
      ? 'Máximo 120 caracteres.'
      : null
  const shownError = submitted ? titleError : null

  // Si el icono guardado no está en la lista curada, se conserva como opción.
  const icons: string[] = HABIT_ICONS.includes(initialIcon as (typeof HABIT_ICONS)[number])
    ? [...HABIT_ICONS]
    : [initialIcon, ...HABIT_ICONS]

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    setSubmitted(true)
    if (titleError) {
      document.getElementById(ids.title)?.focus()
      return
    }
    setBusy(true)
    const payload = { title: title.trim(), icon, color, target_per_week: Number(days) }
    try {
      if (habit) {
        const before = useWorkspace.getState().habits.find((h) => h.id === habit.id)
        await updateHabit(habit.id, payload)
        const after = useWorkspace.getState().habits.find((h) => h.id === habit.id)
        if (after && after !== before) onDone()
      } else {
        const created = await addHabit(payload)
        if (created) onDone()
      }
    } finally {
      setBusy(false)
    }
  }

  const n = Number(days)

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Título" htmlFor={ids.title} error={shownError}>
        <input
          id={ids.title}
          className={clsx('k-input', shownError && 'border-danger/60')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Leer 20 minutos"
          maxLength={120}
          autoComplete="off"
          aria-invalid={Boolean(shownError)}
          data-autofocus
        />
      </Field>

      <FieldGroup id={ids.icon} label="Icono">
        <RadioTiles<string>
          labelledBy={ids.icon}
          value={icon}
          onChange={setIcon}
          className="grid grid-cols-8 gap-1.5"
          tileClassName="flex aspect-square items-center justify-center text-[18px] leading-none"
          options={icons.map((i) => ({ value: i, label: <span aria-hidden>{i}</span>, ariaLabel: `Icono ${i}` }))}
        />
      </FieldGroup>

      <FieldGroup
        id={ids.days}
        label="Días por semana"
        hint={
          n === 7
            ? 'Cada día. La racha cuenta días seguidos.'
            : `${n} ${n === 1 ? 'día' : 'días'} a la semana, los que tú elijas. La racha cuenta semanas cumplidas.`
        }
      >
        <div className="max-w-full overflow-x-auto">
          <Segmented<Days>
            label="Días por semana"
            value={days}
            onChange={setDays}
            options={DAYS.map((d) => ({ value: d, label: <span className="inline-block w-3 text-center font-mono">{d}</span> }))}
          />
        </div>
      </FieldGroup>

      <FieldGroup id={ids.color} label="Color">
        <ColorPicker labelledBy={ids.color} value={color} onChange={setColor} />
      </FieldGroup>

      <div className="-mx-5 mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 pt-3">
        {onSwitchToGoal && (
          <Button variant="quiet" size="sm" className="mr-auto px-0" onClick={onSwitchToGoal}>
            ¿Es un objetivo?
          </Button>
        )}
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={busy}>
          {habit ? 'Guardar' : 'Crear hábito'}
        </Button>
      </div>
    </form>
  )
}
