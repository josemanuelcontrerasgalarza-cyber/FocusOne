'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Overlay'
import { Kbd } from '@/components/ui/primitives'
import { useUI } from '@/store/uiStore'
import { useWorkspace } from '@/store/workspace'
import { ALL_NAV } from './nav'

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  if (!t) return false
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
}

/**
 * Atajos globales. ⌘K/Ctrl+K siempre; las teclas sueltas (N, F, /, ?, G+x, [)
 * solo si están activadas en Ajustes y no se está escribiendo.
 */
export function useGlobalShortcuts() {
  const router = useRouter()
  const enabled = useWorkspace((s) => s.settings.shortcuts.enabled)
  const gPending = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUI.getState()
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ui.setPalette(!ui.paletteOpen)
        return
      }
      if (!enabled || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (ui.paletteOpen || ui.captureOpen || ui.taskId || ui.shortcutsOpen) return
      if (document.querySelector('[role="dialog"]')) return

      if (gPending.current) {
        const item = ALL_NAV.find((n) => n.key === e.key.toLowerCase())
        window.clearTimeout(gPending.current)
        gPending.current = null
        if (item) {
          e.preventDefault()
          router.push(item.href)
        }
        return
      }
      switch (e.key) {
        case 'g':
        case 'G':
          gPending.current = window.setTimeout(() => (gPending.current = null), 1200)
          return
        case 'n':
        case 'N':
          e.preventDefault()
          ui.openCapture()
          return
        case 'f':
        case 'F':
          e.preventDefault()
          router.push('/enfoque')
          return
        case '/':
          e.preventDefault()
          ui.setPalette(true)
          return
        case '?':
          e.preventDefault()
          ui.setShortcuts(true)
          return
        case '[':
          e.preventDefault()
          ui.toggleSidebar()
          return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, router])
}

const GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: 'General',
    items: [
      [['⌘', 'K'], 'Paleta de comandos y búsqueda'],
      [['N'], 'Nueva tarea (captura rápida)'],
      [['F'], 'Ir al modo enfoque'],
      [['/'], 'Buscar'],
      [['['], 'Contraer / expandir la barra lateral'],
      [['?'], 'Mostrar esta ayuda'],
    ],
  },
  {
    title: 'Navegación (G y después…)',
    items: ALL_NAV.filter((n) => n.key).map((n) => [['G', (n.key as string).toUpperCase()], n.label]),
  },
  {
    title: 'Modo enfoque',
    items: [
      [['Espacio'], 'Iniciar / pausar'],
      [['Esc'], 'Salir del modo inmersivo'],
    ],
  },
]

export function ShortcutsHelp() {
  const { shortcutsOpen, setShortcuts } = useUI()
  const enabled = useWorkspace((s) => s.settings.shortcuts.enabled)
  return (
    <Modal
      open={shortcutsOpen}
      onClose={() => setShortcuts(false)}
      title="Atajos de teclado"
      description={enabled ? undefined : 'Las teclas sueltas están desactivadas en Ajustes; ⌘K sigue funcionando.'}
      size="md"
    >
      <div className="grid gap-5 pb-2 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="k-eyebrow mb-2">{g.title}</p>
            <ul className="space-y-1.5">
              {g.items.map(([keys, text]) => (
                <li key={text} className="flex items-center justify-between gap-3 text-sm text-ink-dim">
                  <span>{text}</span>
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  )
}
