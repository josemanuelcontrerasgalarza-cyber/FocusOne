'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore } from '@/lib/toast'

// Colores funcionales propios (no ember/metal: esos acentos están reservados
// a la misión activa y la racha en el sistema "La Fragua").
const icons = {
  success: <CheckCircle2 size={16} className="text-[#8FD9A8]" />,
  error: <AlertTriangle size={16} className="text-[#F2777A]" />,
  info: <Info size={16} className="text-forge-ink-faint" />,
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className="forge-panel pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 text-sm text-forge-ink"
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 480, damping: 32 }}
          >
            {icons[t.kind]}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
                className="font-forge text-xs font-bold text-ember"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="ml-1 text-forge-ink-faint hover:text-forge-ink"
              aria-label="Cerrar notificación"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
