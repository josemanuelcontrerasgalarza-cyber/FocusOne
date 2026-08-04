import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface PushOptions {
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

interface ToastState {
  toasts: ToastItem[]
  push: (kind: ToastKind, message: string, opts?: PushOptions) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message, opts) => {
    const id = nextId++
    set((s) => ({
      toasts: [...s.toasts, { id, kind, message, actionLabel: opts?.actionLabel, onAction: opts?.onAction }],
    }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, opts?.duration ?? 3500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (m: string) => useToastStore.getState().push('success', m),
  error: (m: string) => useToastStore.getState().push('error', m),
  info: (m: string) => useToastStore.getState().push('info', m),
  /** Toast con acción "Deshacer". `onUndo` corre solo si se pulsa a tiempo. */
  undo: (m: string, onUndo: () => void, duration = 5000) =>
    useToastStore.getState().push('info', m, { duration, actionLabel: 'Deshacer', onAction: onUndo }),
}
