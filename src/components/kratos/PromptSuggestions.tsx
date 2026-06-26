'use client'

import { motion } from 'framer-motion'
import { Calendar, ListChecks, Sparkles, Target } from 'lucide-react'

const SUGGESTIONS = [
  { icon: ListChecks, text: 'Resume mis tareas de hoy' },
  { icon: Calendar, text: 'Ayúdame a planificar mi semana' },
  { icon: Target, text: 'Dame ideas para mi misión principal' },
  { icon: Sparkles, text: 'Técnicas para concentrarme mejor' },
]

/** Chips de sugerencia que rellenan el input en el estado vacío del chat. */
export function PromptSuggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
      {SUGGESTIONS.map((s, i) => {
        const Icon = s.icon
        return (
          <motion.button
            key={s.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => onPick(s.text)}
            className="flex items-center gap-3 rounded-xl border border-glass-border bg-surface/40 px-4 py-3 text-left text-sm text-ink-dim transition-all hover:border-glass-border-hi hover:text-ink"
          >
            <Icon size={16} className="shrink-0 text-core" />
            {s.text}
          </motion.button>
        )
      })}
    </div>
  )
}
