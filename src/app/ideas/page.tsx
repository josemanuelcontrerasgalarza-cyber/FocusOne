'use client'

import { useEffect, useState } from 'react'
import { Plus, Rocket, Trash2, Lightbulb, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'
import { useAuthStore } from '@/store/authStore'
import { useIdeaStore } from '@/store/ideaStore'

function Ideas() {
  const user = useAuthStore((s) => s.user)
  const { ideas, fetchIdeas, createIdea, deleteIdea, convertToProject } = useIdeaStore()
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (user?.id) fetchIdeas(user.id)
  }, [user?.id, fetchIdeas])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !title.trim()) return
    await createIdea({ user_id: user.id, title: title.trim() })
    setTitle('')
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="mt-2">
        <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">
          Bóveda de ideas
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Captura <span className="text-gradient">ahora</span>, decide después
        </h1>
      </header>

      {/* Input grande e inline */}
      <form onSubmit={handleCreate} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Lightbulb
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-ghost"
          />
          <input
            placeholder="Una idea fugaz… captúrala antes de que se evapore"
            className="glass-input py-3.5 pl-11 pr-4 text-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <Button type="submit" variant="plasma" size="lg">
          <Plus size={16} /> Capturar
        </Button>
      </form>

      {/* Empty state */}
      {ideas.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassPanel className="p-12 text-center" tilt={false}>
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-plasma/10 text-[#c4b5fd]"
            >
              <Lightbulb size={32} />
            </motion.div>
            <p className="font-display text-base font-medium text-ink-dim">La bóveda está vacía</p>
            <p className="mt-1 text-sm text-ink-ghost">
              Las ideas que no se capturan, se evaporan. Escribe la primera arriba.
            </p>
          </GlassPanel>
        </motion.div>
      )}

      {/* Grid de ideas */}
      <div className="grid gap-3 sm:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {ideas.map((idea, i) => (
            <motion.div
              key={idea.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24, delay: i * 0.03 }}
            >
              <GlassPanel
                className={`group p-4 transition-all hover:border-white/20 ${idea.converted_to_project_id ? 'opacity-60' : ''}`}
                tilt={false}
              >
                <p className="text-sm leading-relaxed">{idea.title}</p>
                <div className="mt-3 flex items-center justify-between">
                  {idea.converted_to_project_id ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-data text-[10px] uppercase tracking-wider text-emerald-400">
                      <CheckCircle2 size={11} /> Convertida
                    </span>
                  ) : (
                    <button
                      onClick={() => convertToProject(idea)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-plasma/30 bg-plasma/10 px-3 py-1 text-xs font-medium text-[#c4b5fd] transition-all hover:border-plasma/60 hover:bg-plasma/20 hover:text-white"
                    >
                      <Rocket size={12} /> Convertir en misión
                    </button>
                  )}
                  <button
                    onClick={() => deleteIdea(idea.id)}
                    className="ml-2 rounded-lg p-1.5 text-ink-ghost transition-all hover:bg-nova/10 hover:text-nova"
                    title="Eliminar idea"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function IdeasPage() {
  return (
    <AppShell>
      <Ideas />
    </AppShell>
  )
}
