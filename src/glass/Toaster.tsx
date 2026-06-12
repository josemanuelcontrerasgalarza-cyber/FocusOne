'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore } from '@/lib/toast'

const icons = {
  success: <CheckCircle2 size={16} className="text-core" />,
  error: <AlertTriangle size={16} className="text-nova" />,
  info: <Info size={16} className="text-[#c4b5fd]" />,
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className="glass-panel pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 text-sm"
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 480, damping: 32 }}
          >
            {icons[t.kind]}
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="ml-1 text-ink-ghost hover:text-ink">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
