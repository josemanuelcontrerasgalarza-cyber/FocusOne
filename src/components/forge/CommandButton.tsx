'use client'

import { Search } from 'lucide-react'
import { FORGE_COMMAND_EVENT } from './ForgeCommand'

/** Botón del header que abre la paleta de comandos (también accesible con ⌘K). */
export function CommandButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event(FORGE_COMMAND_EVENT))}
      aria-label="Abrir comandos"
      className="flex items-center gap-2 rounded-full border border-forge-line bg-forge-surface px-3 py-1.5 text-forge-ink-dim transition-colors hover:text-forge-ink"
    >
      <Search size={14} />
      <kbd className="hidden font-num text-[11px] text-forge-ink-faint sm:inline">
        ⌘K
      </kbd>
    </button>
  )
}
