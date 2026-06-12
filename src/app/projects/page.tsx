'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Crosshair } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { PlasmaBar } from '@/glass/PlasmaBar'
import { Button } from '@/glass/Button'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'

function Projects() {
  const user = useAuthStore((s) => s.user)
  const { projects, fetchProjects, createProject, setMainProject } = useProjectStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')

  useEffect(() => {
    if (user?.id) fetchProjects(user.id)
  }, [user?.id, fetchProjects])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !name.trim()) return
    const project = await createProject({
      user_id: user.id,
      name: name.trim(),
      goal: goal.trim() || undefined,
      is_main: projects.length === 0,
    })
    if (project) {
      setName('')
      setGoal('')
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="mt-2 flex items-end justify-between">
        <div>
          <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">
            Misiones
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Tus misiones</h1>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus size={15} /> Nueva
        </Button>
      </header>

      {creating && (
        <GlassPanel className="p-5" tilt={false}>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input
              autoFocus
              required
              placeholder="Nombre de la misión"
              className="glass-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder="¿Cuál es el objetivo final? (opcional)"
              className="glass-input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit">Lanzar misión</Button>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </GlassPanel>
      )}

      {projects.length === 0 && !creating && (
        <GlassPanel className="p-8 text-center">
          <p className="text-sm text-ink-dim">
            Aún no hay misiones. Crea la primera — y recuerda: una misión principal a la vez.
          </p>
        </GlassPanel>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p, i) => (
          <GlassPanel key={p.id} className="p-5" delay={i * 0.04}>
            <div className="flex items-start justify-between gap-2">
              <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-semibold hover:text-core">
                  {p.name}
                </p>
                {p.goal && <p className="mt-0.5 truncate text-xs text-ink-ghost">{p.goal}</p>}
              </Link>
              {p.is_main ? (
                <span className="shrink-0 rounded-full border border-core/40 bg-core/10 px-2 py-0.5 font-data text-[10px] uppercase tracking-wider text-core">
                  Principal
                </span>
              ) : (
                user && (
                  <button
                    onClick={() => setMainProject(p.id, user.id)}
                    title="Hacer misión principal"
                    className="shrink-0 text-ink-ghost transition-colors hover:text-core"
                  >
                    <Crosshair size={16} />
                  </button>
                )
              )}
            </div>
            <PlasmaBar value={p.progress} className="mt-4" />
            <div className="mt-2 flex items-center justify-between">
              <p className="font-data text-xs text-ink-ghost">{p.progress}%</p>
              <p className="font-data text-[10px] uppercase tracking-wider text-ink-ghost">
                {p.status === 'active' ? 'En curso' : p.status}
              </p>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <AppShell>
      <Projects />
    </AppShell>
  )
}
