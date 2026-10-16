'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Star } from 'lucide-react'

interface Props {
  value: number
  onChange?: (v: number) => void
  size?: number
  readOnly?: boolean
}

/** Estrellas de valoración. Interactivas si se pasa `onChange`; si no, solo lectura. */
export function StarRating({ value, onChange, size = 18, readOnly = false }: Props) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  if (readOnly) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} de 5 estrellas`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={size}
            aria-hidden
            className={n <= value ? 'fill-warm text-warm' : 'text-line-strong'}
          />
        ))}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Valoración">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="rounded p-0.5 transition-transform duration-150 hover:scale-110"
          aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            aria-hidden
            className={clsx('transition-colors', n <= active ? 'fill-warm text-warm' : 'text-line-strong')}
          />
        </button>
      ))}
    </div>
  )
}
