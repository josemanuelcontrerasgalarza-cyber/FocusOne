import { create } from 'zustand'

interface UIState {
  commandOpen: boolean
  shortcutsOpen: boolean
  setCommandOpen: (v: boolean) => void
  toggleCommand: () => void
  setShortcutsOpen: (v: boolean) => void
}

/**
 * Estado de UI global y efímero (no se persiste): paleta de comandos y ayuda
 * de atajos. Permite abrirlos desde cualquier parte.
 */
export const useUIStore = create<UIState>((set) => ({
  commandOpen: false,
  shortcutsOpen: false,
  setCommandOpen: (v) => set({ commandOpen: v }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
}))
