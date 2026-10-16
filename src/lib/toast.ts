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
  push: (kind: ToastKind, message: string, opts?: { action?: ToastAction; duration?: number }) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message, opts) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, message, action: opts?.action }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, opts?.duration ?? (opts?.action ? 6000 : 3200))
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

type Opts = { action?: ToastAction; duration?: number }

export const toast = {
  success: (m: string, o?: Opts) => useToastStore.getState().push('success', m, o),
  error: (m: string, o?: Opts) => useToastStore.getState().push('error', m, o),
  info: (m: string, o?: Opts) => useToastStore.getState().push('info', m, o),
}
