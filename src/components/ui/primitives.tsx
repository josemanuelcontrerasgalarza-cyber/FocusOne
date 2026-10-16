import type { ReactNode } from 'react'
import clsx from 'clsx'

/* ───────────────────────── Superficies ───────────────────────── */

export function Card({
  className,
  children,
  as: Tag = 'div',
  interactive,
}: {
  className?: string
  children: ReactNode
  as?: 'div' | 'section' | 'article' | 'li'
  interactive?: boolean
}) {
  return (
    <Tag
      className={clsx(
        'rounded-card border border-line bg-surface',
        interactive && 'transition-colors hover:border-line-strong',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/** Encabezado de sección dentro de una tarjeta. */
export function CardHeader({ title, action, eyebrow }: { title: ReactNode; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
      <div className="min-w-0">
        {eyebrow && <p className="k-eyebrow mb-0.5">{eyebrow}</p>}
        <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      </div>
      {action}
    </div>
  )
}

/* ───────────────────────── Encabezado de página ───────────────────────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={clsx('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="k-eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-dim">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/* ───────────────────────── Chips / insignias ───────────────────────── */

export type Tone = 'neutral' | 'accent' | 'warm' | 'success' | 'danger' | 'info'

const TONE: Record<Tone, string> = {
  neutral: 'border-line bg-sunken text-ink-dim',
  accent: 'border-accent-fg/25 bg-accent/15 text-accent-fg',
  warm: 'border-warm/25 bg-warm/10 text-warm',
  success: 'border-success/25 bg-success/10 text-success',
  danger: 'border-danger/25 bg-danger/10 text-danger',
  info: 'border-info/25 bg-info/10 text-info',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-2xs font-medium',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-sunken px-1 font-mono text-[10px] font-medium text-ink-dim">
      {children}
    </kbd>
  )
}

/* ───────────────────────── Estados ───────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('k-skeleton', className)} aria-hidden />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div className={clsx('flex flex-col items-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-sunken text-ink-dim">
          {icon}
        </div>
      )}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-dim">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ───────────────────────── Progreso ───────────────────────── */

export function ProgressBar({ value, className, tone = 'accent' }: { value: number; className?: string; tone?: 'accent' | 'warm' | 'ink' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  const fill = tone === 'accent' ? 'bg-accent-fg' : tone === 'warm' ? 'bg-warm' : 'bg-ink'
  return (
    <div
      className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-sunken', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={clsx('h-full rounded-full transition-[width] duration-500 ease-out', fill)} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Anillo de progreso (SVG). value 0..1. */
export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  children,
  className,
}: {
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
  className?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-sunken" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-accent-fg transition-[stroke-dashoffset] duration-700 ease-out"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - v)}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}

/* ───────────────────────── Formularios ───────────────────────── */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
}: {
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
  htmlFor?: string
  className?: string
}) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
      </label>
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

/** Control segmentado (vistas, rangos). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  size?: 'sm' | 'md'
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-control border border-line bg-sunken p-0.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-[7px] font-medium transition-colors',
              size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-[13px]',
              active ? 'bg-raised text-ink shadow-card' : 'text-ink-dim hover:text-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Interruptor accesible (role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
  id?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-ink-dim">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-accent-fg bg-accent-fg' : 'border-line-strong bg-sunken',
        )}
      >
        <span
          className={clsx(
            'inline-block h-4 w-4 rounded-full shadow-card transition-transform duration-150',
            checked ? 'translate-x-[19px] bg-canvas' : 'translate-x-[3px] bg-ink-faint',
          )}
        />
      </button>
    </div>
  )
}

/* ───────────────────────── Identidad ───────────────────────── */

export function Avatar({ name, size = 32, className }: { name?: string | null; size?: number; className?: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-sunken font-semibold text-ink',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initial}
    </span>
  )
}

/** Cifra destacada con etiqueta. */
export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('min-w-0', className)}>
      <p className="k-eyebrow">{label}</p>
      <p className="mt-1 font-mono text-[26px] font-medium leading-none tracking-[-0.02em] text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-ink-dim">{hint}</p>}
    </div>
  )
}
