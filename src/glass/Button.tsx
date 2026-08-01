'use client'

import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'core' | 'plasma' | 'ghost' | 'danger' | 'solid-core' | 'solid-plasma'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

const variants: Record<Variant, string> = {
  core: 'bg-core/12 text-core border-core/35 hover:bg-core/22 hover:border-core/55 hover:shadow-glow-core',
  plasma: 'bg-plasma/15 text-[#c4b5fd] border-plasma/35 hover:bg-plasma/25 hover:border-plasma/55 hover:shadow-glow-plasma',
  ghost: 'bg-transparent text-ink-dim border-glass-border hover:text-ink hover:bg-white/[0.06] hover:border-glass-border-hi',
  danger: 'bg-nova/12 text-nova border-nova/35 hover:bg-nova/22 hover:shadow-glow-nova',
  'solid-core': 'bg-gradient-to-br from-core to-plasma text-void border-transparent font-semibold hover:opacity-90 hover:shadow-glow-core',
  'solid-plasma': 'bg-gradient-to-br from-plasma to-core text-void border-transparent font-semibold hover:opacity-90 hover:shadow-glow-plasma',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-xl',
  lg: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
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
        'inline-flex items-center justify-center border font-display font-medium tracking-wide transition-all duration-200 active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none',
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
