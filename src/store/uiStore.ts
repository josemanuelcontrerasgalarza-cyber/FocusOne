import { create } from 'zustand'

/** Intención efímera para coordinar acciones entre páginas (ej. abrir el form
 *  de nueva misión al navegar desde la paleta), sin usar query params. */
export type Intent = 'new-project' | null

interface UIState {
  commandOpen: boolean
  shortcutsOpen: boolean
  intent: Intent
  setCommandOpen: (v: boolean) => void
  toggleCommand: () => void
  setShortcutsOpen: (v: boolean) => void
  setIntent: (i: Intent) => void
  consumeIntent: () => Intent
}

/**
 * Estado de UI global y efímero (no se persiste): paleta de comandos, ayuda de
 * atajos e intenciones de navegación. Permite abrirlos desde cualquier parte.
 */
export const useUIStore = create<UIState>((set, get) => ({
  commandOpen: false,
  shortcutsOpen: false,
  intent: null,
  setCommandOpen: (v) => set({ commandOpen: v }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
  setIntent: (i) => set({ intent: i }),
  consumeIntent: () => {
    const i = get().intent
    if (i) set({ intent: null })
    return i
  },
}))
