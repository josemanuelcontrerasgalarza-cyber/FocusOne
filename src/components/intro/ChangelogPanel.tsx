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
              i === 0 ? 'bg-ember shadow-ember' : 'bg-forge-ink-faint',
            )}
          />
          {i < CHANGELOG.length - 1 && (
            <span className="absolute left-[4px] top-4 h-[calc(100%-0.5rem)] w-px bg-forge-line" />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-forge text-base font-bold text-forge-ink">v{entry.version}</span>
            <span className="text-sm text-forge-ink-dim">· {entry.title}</span>
            {entry.tag && (
              <span className="inline-flex items-center gap-1 rounded-full border border-ember/40 bg-ember/10 px-2 py-0.5 font-num text-[10px] uppercase tracking-wide text-ember">
                <Sparkles size={10} /> {entry.tag}
              </span>
            )}
            {entry.date && (
              <span className="ml-auto font-num text-[10px] text-forge-ink-faint">{entry.date}</span>
            )}
          </div>

          <ul className="mt-1.5 flex flex-col gap-1">
            {entry.items.map((it, j) => (
              <li key={j} className="flex gap-2 text-sm text-forge-ink-dim">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ember/60" />
                {it}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
