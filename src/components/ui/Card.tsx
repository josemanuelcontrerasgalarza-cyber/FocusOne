import { type ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Padding = 'sm' | 'md' | 'lg'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: Padding
  hover?: boolean
  onClick?: () => void
}

const paddingClasses: Record<Padding, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({ children, className, padding = 'md', hover = false, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-bg-surface rounded-xl border border-border',
        paddingClasses[padding],
        hover && 'hover:border-border-muted hover:bg-bg-elevated transition-colors duration-150 cursor-pointer',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
