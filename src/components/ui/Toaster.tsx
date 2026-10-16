'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, AlertCircle, Info, X } from 'lucide-react'
import { useToastStore } from '@/lib/toast'

const ICON = {
  success: <Check size={14} strokeWidth={2.6} className="text-success" />,
  error: <AlertCircle size={14} className="text-danger" />,
  info: <Info size={14} className="text-info" />,
}

/** Avisos no invasivos, abajo al centro (encima de la nav móvil). */
export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[120] flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-control border border-line bg-raised px-3.5 py-2.5 text-sm text-ink shadow-pop"
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            {ICON[t.kind]}
            <span className="min-w-0">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
                className="ml-1 rounded-md px-1.5 py-0.5 text-sm font-semibold text-accent-fg hover:bg-accent/15"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="ml-0.5 text-ink-faint hover:text-ink">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
