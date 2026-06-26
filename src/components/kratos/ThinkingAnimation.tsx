'use client'

import { motion } from 'framer-motion'
import { BrainCircuit } from 'lucide-react'
import { TypingIndicator } from './TypingIndicator'

/** "Kratos está pensando…" — se muestra antes de que llegue el primer token. */
export function ThinkingAnimation() {
  return (
    <div className="flex gap-3">
      <motion.div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-core to-plasma text-void"
        animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 0 rgba(94,234,212,0)', '0 0 18px rgba(94,234,212,0.5)', '0 0 0 rgba(94,234,212,0)'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BrainCircuit size={15} />
      </motion.div>
      <div className="flex flex-col gap-1.5">
        <span className="font-data text-[11px] uppercase tracking-wider text-ink-ghost">Kratos</span>
        <div className="flex items-center gap-2 text-sm text-ink-dim">
          Kratos está pensando
          <TypingIndicator />
        </div>
      </div>
    </div>
  )
}
