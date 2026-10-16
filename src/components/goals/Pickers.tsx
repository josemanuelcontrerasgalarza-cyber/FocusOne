'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { PROJECT_COLORS } from '@/lib/colors'
import type { ProjectColor } from '@/lib/kairo/types'

/** Navegación con flechas en un radiogroup (patrón WAI-ARIA, foco itinerante). */
function onRadioKeys<T>(e: KeyboardEvent<HTMLElement>, values: readonly T[], value: T, onChange: (v: T) => void) {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(e.key)) return
  e.preventDefault()
  const i = Math.max(0, values.indexOf(value))
  const n = values.length
  const next =
    e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n
  onChange(values[next])
  e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
}

/** Como `Field`, pero para grupos de controles (radiogroups): etiqueta con id. */
export function FieldGroup({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string | null
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <p id={id} className="text-[13px] font-medium text-ink">
        {label}
      </p>
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  )
}

const COLOR_KEYS =Object.keys(PROJECT_COLORS) as ProjectColor[]

export function ColorPicker({
  value,
  onChange,
  labelledBy,
}: {
  value: ProjectColor
  onChange: (c: ProjectColor) => void
  labelledBy: string
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-2"
      onKeyDown={(e) => onRadioKeys(e, COLOR_KEYS, value, onChange)}
    >
      {COLOR_KEYS.map((k) => {
        const active = k === value
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={PROJECT_COLORS[k].label}
            title={PROJECT_COLORS[k].label}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(k)}
            className={clsx(
              'inline-flex h-7 w-7 items-center justify-center rounded-full transition-[box-shadow,transform] duration-150 hover:scale-105',
              active && 'ring-2 ring-ink/70 ring-offset-2 ring-offset-raised',
            )}
            style={{ background: PROJECT_COLORS[k].hex }}
          >
            {active && <Check size={14} strokeWidth={3} className="text-accent-ink" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}

/** Selector de opciones en baldosas (tipo de objetivo, icono de hábito…). */
export function RadioTiles<T extends string>({
  value,
  onChange,
  options,
  labelledBy,
  className,
  tileClassName,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; hint?: ReactNode; ariaLabel?: string }[]
  labelledBy: string
  className?: string
  tileClassName?: string
}) {
  const values = options.map((o) => o.value)
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={className}
      onKeyDown={(e) => onRadioKeys(e, values, value, onChange)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={clsx(
              'rounded-control border text-left transition-colors',
              active ? 'border-accent-fg/60 bg-accent/10 text-ink' : 'border-line bg-raised text-ink-dim hover:border-line-strong hover:text-ink',
              tileClassName,
            )}
          >
            {o.label}
            {o.hint && <span className="mt-0.5 block text-xs font-normal text-ink-dim">{o.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}
