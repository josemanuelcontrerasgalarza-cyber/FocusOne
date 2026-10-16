import Link from 'next/link'
import clsx from 'clsx'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

// Mismas clases que `Button` (ui/Button.tsx) para que un enlace con aspecto de
// botón sea indistinguible de un botón real.
const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-[1.04] active:brightness-95 font-semibold',
  secondary: 'border border-line bg-raised text-ink hover:border-line-strong hover:bg-surface',
  ghost: 'text-ink-dim hover:bg-sunken hover:text-ink',
  quiet: 'text-ink-dim hover:text-ink',
}
const SIZE: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-[13px]',
  md: 'h-9 gap-2 px-3.5 text-sm',
  lg: 'h-11 gap-2 px-5 text-[15px]',
}

export function buttonClasses(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return clsx(
    'inline-flex select-none items-center justify-center whitespace-nowrap rounded-control font-medium transition-[background-color,border-color,color,filter] duration-150',
    VARIANT[variant],
    SIZE[size],
    className,
  )
}

/** Enlace (next/link) con el aspecto de `Button`. */
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode; iconRight?: ReactNode }) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  )
}
