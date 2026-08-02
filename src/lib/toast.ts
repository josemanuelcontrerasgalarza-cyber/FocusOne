import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  action?: ToastAction
}

interface ToastState {
  toasts: ToastItem[]
  push: (kind: ToastKind, message: string, action?: ToastAction) => void
  dismiss: (id: number) => void
}

let nextId = 1

// Los toasts con acción (p. ej. "Deshacer") se quedan más tiempo: el usuario
// necesita ese margen extra para leer, decidir y pulsar.
const AUTO_DISMISS_MS = 3500
const AUTO_DISMISS_WITH_ACTION_MS = 6000

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message, action) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, kind, message, action }] }))
    setTimeout(
      () => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      },
      action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS,
    )
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (m: string) => useToastStore.getState().push('success', m),
  error: (m: string) => useToastStore.getState().push('error', m),
  info: (m: string) => useToastStore.getState().push('info', m),
  /** Toast con botón de acción (p. ej. "Deshacer" tras un borrado optimista). */
  undo: (m: string, onUndo: () => void) =>
    useToastStore.getState().push('info', m, { label: 'Deshacer', onClick: onUndo }),
}
