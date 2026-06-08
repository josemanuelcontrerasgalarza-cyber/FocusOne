import { cn } from '../../lib/utils'

type Size = 'sm' | 'md' | 'lg'

interface ProgressBarProps {
  value: number
  color?: string
  showLabel?: boolean
  size?: Size
  className?: string
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

export function ProgressBar({ value, color, showLabel = false, size = 'md', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 bg-bg-elevated rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            backgroundColor: color ?? '#7C3AED',
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-text-muted w-8 text-right shrink-0">{clamped}%</span>
      )}
    </div>
  )
}
