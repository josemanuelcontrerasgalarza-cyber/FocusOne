'use client'

import { useEffect, useState } from 'react'
import { Plus, Rocket, Trash2, Lightbulb } from 'lucide-react'
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
    <div className="flex flex-col gap-5">
      <header className="mt-2">
        <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">
          Bóveda de ideas
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Captura ahora, decide después</h1>
      </header>

      <GlassPanel className="p-5" tilt={false}>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            placeholder="Una idea fugaz…"
            className="glass-input flex-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="submit" variant="plasma">
            <Plus size={15} />
          </Button>
        </form>
      </GlassPanel>

      {ideas.length === 0 && (
        <GlassPanel className="p-8 text-center">
          <Lightbulb className="mx-auto mb-2 text-ink-ghost" size={28} />
          <p className="text-sm text-ink-dim">
            La bóveda está vacía. Las ideas que no se capturan, se evaporan.
          </p>
        </GlassPanel>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {ideas.map((idea, i) => (
          <GlassPanel key={idea.id} className="p-4" delay={i * 0.03}>
            <p className="text-sm">{idea.title}</p>
            <div className="mt-3 flex items-center justify-between">
              {idea.converted_to_project_id ? (
                <span className="font-data text-[10px] uppercase tracking-wider text-core">
                  ✓ Convertida en misión
                </span>
              ) : (
                <button
                  onClick={() => convertToProject(idea)}
                  className="inline-flex items-center gap-1.5 text-xs text-[#c4b5fd] hover:text-plasma"
                >
                  <Rocket size={13} /> Convertir en misión
                </button>
              )}
              <button
                onClick={() => deleteIdea(idea.id)}
                className="text-ink-ghost transition-colors hover:text-nova"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </GlassPanel>
        ))}
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
