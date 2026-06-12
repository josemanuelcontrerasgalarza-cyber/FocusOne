'use client'

import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'core' | 'plasma' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

const variants: Record<Variant, string> = {
  core: 'bg-core/15 text-core border-core/40 hover:bg-core/25 hover:shadow-glow-core',
  plasma: 'bg-plasma/20 text-[#c4b5fd] border-plasma/40 hover:bg-plasma/30 hover:shadow-glow-plasma',
  ghost: 'bg-transparent text-ink-dim border-transparent hover:text-ink hover:bg-white/5',
  danger: 'bg-nova/15 text-nova border-nova/40 hover:bg-nova/25',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'core',
  size = 'md',
  loading,
  fullWidth,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border font-display font-medium tracking-wide transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
