'use client'

import { useEffect } from 'react'
import { Keyboard } from 'lucide-react'
import { Modal, ModalClose } from '@/glass/Modal'
import { useUIStore } from '@/store/uiStore'

const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ['⌘', 'K'], desc: 'Abrir la paleta de comandos' },
  { keys: ['Ctrl', 'K'], desc: 'Paleta de comandos (Windows/Linux)' },
  { keys: ['?'], desc: 'Mostrar esta ayuda' },
  { keys: ['Esc'], desc: 'Cerrar diálogos' },
  { keys: ['↑', '↓'], desc: 'Navegar resultados en la paleta' },
  { keys: ['↵'], desc: 'Ejecutar la opción seleccionada' },
]

function isTyping() {
  const el = document.activeElement
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el as HTMLElement)?.isContentEditable
  )
}

export function ShortcutsHelp() {
  const { shortcutsOpen, setShortcutsOpen } = useUIStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !isTyping()) {
        e.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setShortcutsOpen])

  return (
    <Modal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} className="max-w-md">
      <ModalClose onClose={() => setShortcutsOpen(false)} />
      <div className="p-6">
        <div className="flex items-center gap-2 text-core">
          <Keyboard size={18} />
          <h2 className="font-display text-lg font-semibold text-ink">Atajos de teclado</h2>
        </div>
        <div className="mt-5 flex flex-col gap-2.5">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="text-sm text-ink-dim">{s.desc}</span>
              <span className="flex shrink-0 items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-glass-border bg-white/5 px-2 py-1 font-data text-[11px] text-ink"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
