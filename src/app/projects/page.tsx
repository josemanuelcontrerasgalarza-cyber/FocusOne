'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Crosshair, ChevronRight, Target, Rocket } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { PlasmaBar } from '@/glass/PlasmaBar'
import { Button } from '@/glass/Button'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'

function Projects() {
  const user = useAuthStore((s) => s.user)
  const { projects, fetchProjects, createProject, setMainProject } = useProjectStore()
  const consumeIntent = useUIStore((s) => s.consumeIntent)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')

  useEffect(() => {
    if (user?.id) fetchProjects(user.id)
  }, [user?.id, fetchProjects])

  // Si llegamos desde la paleta con la intención de crear, abre el formulario
  useEffect(() => {
    if (consumeIntent() === 'new-project') setCreating(true)
  }, [consumeIntent])

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

  const mainProject = projects.find((p) => p.is_main)
  const secondaryProjects = projects.filter((p) => !p.is_main)

  return (
    <div className="flex flex-col gap-6">
      <header className="mt-2 flex items-end justify-between">
        <div>
          <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">
            Misiones
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            Tus <span className="text-gradient">misiones</span>
          </h1>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus size={15} /> Nueva
        </Button>
      </header>

      {/* Form nueva misión */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <GlassPanel className="card-accent-plasma p-5" tilt={false}>
              <p className="mb-3 font-data text-[10px] uppercase tracking-[0.25em] text-[#c4b5fd]">
                Nueva misión
              </p>
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
                  <Button type="submit" variant="plasma">
                    <Rocket size={14} /> Lanzar misión
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {projects.length === 0 && !creating && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassPanel className="p-12 text-center" tilt={false}>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-core/10 text-core"
            >
              <Target size={32} />
            </motion.div>
            <p className="font-display text-base font-medium text-ink-dim">Sin misiones activas</p>
            <p className="mt-1 text-sm text-ink-ghost">
              Una misión principal a la vez. Lanza la primera.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-core/30 bg-core/10 px-4 py-1.5 text-sm text-core transition-all hover:border-core/60 hover:bg-core/20"
            >
              <Plus size={14} /> Crear misión
            </button>
          </GlassPanel>
        </motion.div>
      )}

      {/* Misión principal */}
      {mainProject && (
        <div className="flex flex-col gap-2">
          <p className="font-data text-[10px] uppercase tracking-[0.3em] text-ink-ghost">
            Misión principal
          </p>
          <GlassPanel className="card-accent-core p-6" delay={0.05}>
            <div className="flex items-start justify-between gap-3">
              <Link href={`/projects/${mainProject.id}`} className="group min-w-0 flex-1">
                <p className="font-display text-xl font-semibold transition-colors group-hover:text-core">
                  {mainProject.name}
                </p>
                {mainProject.goal && (
                  <p className="mt-1 text-sm text-ink-dim">{mainProject.goal}</p>
                )}
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="badge-core">
                  <Crosshair size={10} /> Principal
                </span>
                <Link
                  href={`/projects/${mainProject.id}`}
                  className="flex items-center gap-1 text-xs text-ink-ghost transition-colors hover:text-core"
                >
                  Ver detalle <ChevronRight size={13} />
                </Link>
              </div>
            </div>
            <PlasmaBar value={mainProject.progress} className="mt-5" />
            <div className="mt-2 flex items-center justify-between">
              <p className="font-data text-xs text-core">{mainProject.progress}% completado</p>
              <p className="font-data text-[10px] uppercase tracking-wider text-ink-ghost">
                {mainProject.status === 'active' ? 'En curso' : mainProject.status}
              </p>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Proyectos secundarios */}
      {secondaryProjects.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-data text-[10px] uppercase tracking-[0.3em] text-ink-ghost">
            En órbita
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {secondaryProjects.map((p, i) => (
              <GlassPanel
                key={p.id}
                className="group p-5 transition-all hover:border-white/20"
                delay={0.08 + i * 0.04}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-semibold transition-colors group-hover:text-core">
                      {p.name}
                    </p>
                    {p.goal && (
                      <p className="mt-0.5 truncate text-xs text-ink-ghost">{p.goal}</p>
                    )}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {user && (
                      <button
                        onClick={() => setMainProject(p.id, user.id)}
                        title="Hacer misión principal"
                        className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-white/5 px-2 py-0.5 font-data text-[9px] uppercase tracking-wider text-ink-ghost transition-all hover:border-core/40 hover:bg-core/10 hover:text-core"
                      >
                        <Crosshair size={10} /> Principal
                      </button>
                    )}
                    <ChevronRight
                      size={15}
                      className="text-ink-ghost opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
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
      )}
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
