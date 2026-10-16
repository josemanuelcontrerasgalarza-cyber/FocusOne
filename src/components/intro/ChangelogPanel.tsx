'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { CHANGELOG } from '@/lib/changelog'
import { Badge } from '@/components/ui/primitives'

const INITIAL = 3

/** Historial de versiones (lee src/lib/changelog.ts). */
export function ChangelogPanel() {
  const [all, setAll] = useState(false)
  const entries = all ? CHANGELOG : CHANGELOG.slice(0, INITIAL)

  return (
    <div>
      <ol className="relative">
        {entries.map((entry, i) => {
          const last = i === entries.length - 1
          return (
            <li key={entry.version} className="relative pb-6 pl-6 last:pb-0">
              {/* Línea de tiempo */}
              <span
                aria-hidden
                className={clsx(
                  'absolute left-0 top-[7px] h-2 w-2 rounded-full',
                  i === 0 ? 'bg-accent-fg ring-4 ring-accent/20' : 'bg-line-strong',
                )}
              />
              {!last && <span aria-hidden className="absolute left-[3.5px] top-5 h-[calc(100%-1.25rem)] w-px bg-line" />}

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-[13px] font-medium text-ink">v{entry.version}</span>
                {entry.tag && <Badge tone={i === 0 ? 'accent' : 'neutral'}>{entry.tag}</Badge>}
                {entry.date && <span className="ml-auto font-mono text-[11px] text-ink-faint">{entry.date}</span>}
              </div>
              <p className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">{entry.title}</p>

              <ul className="mt-2 space-y-1.5">
                {entry.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-ink-dim">
                    <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                    {it}
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ol>

      {CHANGELOG.length > INITIAL && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="mt-5 inline-flex items-center gap-1.5 rounded-control text-[13px] font-medium text-ink-dim transition-colors hover:text-ink"
        >
          {all ? 'Ver menos' : `Ver historial completo (${CHANGELOG.length} versiones)`}
          <ChevronDown size={15} className={clsx('transition-transform duration-200', all && 'rotate-180')} />
        </button>
      )}
    </div>
  )
}
