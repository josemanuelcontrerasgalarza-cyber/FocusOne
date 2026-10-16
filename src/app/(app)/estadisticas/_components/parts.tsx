import type { ReactNode } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Card } from '@/components/ui/primitives'
import { formatDelta } from '../_lib/period'

/** Tarjeta de sección: título, subtítulo opcional y un dato/acción a la derecha. */
export function Panel({
  title,
  subtitle,
  aside,
  children,
  className,
}: {
  title: string
  subtitle?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card as="section" className={clsx('flex min-w-0 flex-col', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-dim">{subtitle}</p>}
        </div>
        {aside && <div className="shrink-0 text-right text-xs text-ink-dim">{aside}</div>}
      </div>
      <div className="flex-1 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div>
    </Card>
  )
}

const LINK_VARIANT = {
  primary: 'bg-accent text-accent-ink hover:brightness-[1.04] active:brightness-95 font-semibold',
  secondary: 'border border-line bg-raised text-ink hover:border-line-strong hover:bg-surface',
  quiet: 'text-ink-dim hover:text-ink',
} as const

/** Enlace con aspecto de botón (navegación real, no un <button>). */
export function LinkButton({
  href,
  variant = 'secondary',
  size = 'md',
  icon,
  children,
}: {
  href: string
  variant?: keyof typeof LINK_VARIANT
  size?: 'sm' | 'md'
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-control font-medium transition-[background-color,border-color,color,filter] duration-150',
        size === 'sm' ? 'h-8 gap-1.5 px-2.5 text-[13px]' : 'h-9 gap-2 px-3.5 text-sm',
        variant === 'quiet' && 'h-auto px-0',
        LINK_VARIANT[variant],
      )}
    >
      {icon}
      {children}
    </Link>
  )
}

/** Variación frente al periodo anterior, con flecha y tono (subir es bueno). */
export function DeltaChip({ value, period }: { value: number | null; period: string }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-faint" title={`Sin actividad en los ${period} anteriores`}>
        <span aria-hidden>—</span>
        <span>sin base</span>
        <span className="sr-only">: no hay actividad en los {period} anteriores para comparar</span>
      </span>
    )
  }
  const up = value > 0
  const flat = Math.round(value * 100) === 0
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  const text = flat ? 'igual' : formatDelta(value)
  return (
    <span className={clsx('inline-flex items-center gap-0.5 font-mono text-xs font-medium', flat ? 'text-ink-dim' : up ? 'text-success' : 'text-danger')}>
      <Icon size={13} strokeWidth={2.2} aria-hidden />
      <span>{text}</span>
      <span className="sr-only">
        {flat ? ` que en los ${period} anteriores` : ` respecto a los ${period} anteriores`}
      </span>
    </span>
  )
}

/** Indicador clave: etiqueta, cifra y variación. */
export function KpiCard({
  label,
  value,
  unit,
  delta,
  period,
}: {
  label: string
  value: ReactNode
  unit?: string
  delta: number | null
  period: string
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-2 p-4">
      <p className="k-eyebrow truncate">{label}</p>
      <p className="font-mono text-[26px] font-medium leading-none tracking-[-0.02em] text-ink">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-ink-faint">{unit}</span>}
      </p>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <DeltaChip value={delta} period={period} />
        <span className="text-2xs text-ink-faint" aria-hidden>
          vs. {period} anteriores
        </span>
      </div>
    </Card>
  )
}
