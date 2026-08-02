import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (kind: ToastKind, message: string) => void
  dismiss: (id: number) => void
  /** Pausa el auto-cierre — se usa con onMouseEnter para poder leer el mensaje con calma. */
  pause: (id: number) => void
  /** Reanuda el auto-cierre con el tiempo restante que quedaba al pausar. */
  resume: (id: number) => void
}

const DURATION_MS = 3500
let nextId = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()
// Para cada toast activo: cuándo arrancó el temporizador actual y cuánto le quedaba.
const clocks = new Map<number, { startedAt: number; remainingMs: number }>()

function schedule(id: number, ms: number, set: (fn: (s: ToastState) => Partial<ToastState>) => void) {
  clocks.set(id, { startedAt: Date.now(), remainingMs: ms })
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id)
      clocks.delete(id)
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, ms),
  )
}

function clear(id: number) {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
  clocks.delete(id)
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    schedule(id, DURATION_MS, set)
  },
  dismiss: (id) => {
    clear(id)
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
  pause: (id) => {
    const clock = clocks.get(id)
    const timer = timers.get(id)
    if (!clock || !timer) return
    clearTimeout(timer)
    timers.delete(id)
    clock.remainingMs = Math.max(0, clock.remainingMs - (Date.now() - clock.startedAt))
  },
  resume: (id) => {
    const clock = clocks.get(id)
    if (!clock || timers.has(id)) return
    schedule(id, clock.remainingMs, set)
  },
}))

export const toast = {
  success: (m: string) => useToastStore.getState().push('success', m),
  error: (m: string) => useToastStore.getState().push('error', m),
  info: (m: string) => useToastStore.getState().push('info', m),
}
