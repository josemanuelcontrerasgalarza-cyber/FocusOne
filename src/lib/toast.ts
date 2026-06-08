type ToastType = 'success' | 'error' | 'info'

interface ToastOptions {
  duration?: number
}

interface ToastEvent {
  id: string
  type: ToastType
  message: string
  duration: number
}

type ToastListener = (toast: ToastEvent) => void

const listeners: ToastListener[] = []

function emit(type: ToastType, message: string, options: ToastOptions = {}) {
  const event: ToastEvent = {
    id: Math.random().toString(36).slice(2),
    type,
    message,
    duration: options.duration ?? 3000,
  }
  listeners.forEach(l => l(event))
}

export const toast = {
  success: (message: string, options?: ToastOptions) => emit('success', message, options),
  error: (message: string, options?: ToastOptions) => emit('error', message, options),
  info: (message: string, options?: ToastOptions) => emit('info', message, options),
  subscribe: (listener: ToastListener) => {
    listeners.push(listener)
    return () => {
      const idx = listeners.indexOf(listener)
      if (idx > -1) listeners.splice(idx, 1)
    }
  },
}
