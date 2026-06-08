import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'

interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  duration: number
}

const icons = {
  success: <CheckCircle size={16} className="text-success shrink-0" />,
  error: <XCircle size={16} className="text-danger shrink-0" />,
  info: <Info size={16} className="text-primary-light shrink-0" />,
}

const borderColors = {
  success: 'border-success/30',
  error: 'border-danger/30',
  info: 'border-primary/30',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const unsubscribe = toast.subscribe((t) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id))
      }, t.duration)
    })
    return unsubscribe
  }, [])

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-72">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-lg border bg-bg-surface shadow-lg',
            'animate-slide-in',
            borderColors[t.type],
          )}
        >
          {icons[t.type]}
          <p className="text-sm text-text-primary flex-1">{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            className="text-text-hint hover:text-text-muted shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
