'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore } from '@/lib/toast'

const icons = {
  success: <CheckCircle2 size={16} className="text-metal" />,
  error: <AlertTriangle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-ember" />,
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  const reduceMotion = useReducedMotion()
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[120] flex flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-forge border border-forge-line bg-forge-surface px-4 py-2.5 text-sm text-forge-ink shadow-ember"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 60, scale: 0.95 }}
            transition={
              reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 480, damping: 32 }
            }
          >
            {icons[t.kind]}
            <span>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="ml-1 text-forge-ink-faint transition-colors hover:text-forge-ink"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
