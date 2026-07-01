'use client'

import { Sparkles } from 'lucide-react'
import { CHANGELOG } from '@/lib/changelog'
import { cn } from '@/lib/utils'

export function ChangelogPanel() {
  return (
    <div className="flex max-h-[22rem] flex-col gap-4 overflow-y-auto pr-1">
      {CHANGELOG.map((entry, i) => (
        <div key={entry.version} className="relative pl-5">
          {/* Línea de tiempo */}
          <span
            className={cn(
              'absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full',
              i === 0 ? 'bg-core shadow-glow-core' : 'bg-ink-ghost',
            )}
          />
          {i < CHANGELOG.length - 1 && (
            <span className="absolute left-[4px] top-4 h-[calc(100%-0.5rem)] w-px bg-glass-border" />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-semibold">v{entry.version}</span>
            <span className="text-sm text-ink-dim">· {entry.title}</span>
            {entry.tag && (
              <span className="badge badge-core">
                <Sparkles size={10} /> {entry.tag}
              </span>
            )}
            {entry.date && (
              <span className="ml-auto font-data text-[10px] text-ink-ghost">{entry.date}</span>
            )}
          </div>

          <ul className="mt-1.5 flex flex-col gap-1">
            {entry.items.map((it, j) => (
              <li key={j} className="flex gap-2 text-sm text-ink-dim">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-core/60" />
                {it}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
