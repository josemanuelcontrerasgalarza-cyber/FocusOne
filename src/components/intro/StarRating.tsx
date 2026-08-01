'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  onChange?: (v: number) => void
  size?: number
  readOnly?: boolean
}

/** Estrellas de valoración. Interactivas si se pasa `onChange`, si no solo lectura. */
export function StarRating({ value, onChange, size = 18, readOnly = false }: Props) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={cn(
            'transition-transform',
            !readOnly && 'hover:scale-110',
            readOnly && 'cursor-default',
          )}
          aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            className={cn(
              'transition-colors',
              n <= active ? 'fill-solar text-solar' : 'text-ink-ghost',
            )}
          />
        </button>
      ))}
    </div>
  )
}
