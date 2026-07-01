'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Zap, Target, Lightbulb, BarChart2, Music, Settings,
  Plus, Search, CornerDownLeft, Trophy, type LucideIcon,
} from 'lucide-react'
import { Modal } from '@/glass/Modal'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { cn } from '@/lib/utils'

interface Command {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  group: string
  keywords?: string
  run: () => void
}

export function CommandPalette() {
  const { commandOpen, setCommandOpen, toggleCommand, setIntent } = useUIStore()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { projects, fetchProjects } = useProjectStore()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Atajo global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggleCommand()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleCommand])

  // Al abrir: reset y carga de misiones para la búsqueda
  useEffect(() => {
    if (commandOpen) {
      setQuery('')
      setActive(0)
      if (user?.id && projects.length === 0) fetchProjects(user.id)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandOpen, user?.id, projects.length, fetchProjects])

  function go(href: string) {
    setCommandOpen(false)
    router.push(href)
  }

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: 'go-app',      label: 'Centro de mando', icon: LayoutDashboard, group: 'Ir a', run: () => go('/app') },
      { id: 'go-focus',    label: 'Deep Work',       icon: Zap,             group: 'Ir a', keywords: 'foco temporizador pomodoro', run: () => go('/focus') },
      { id: 'go-projects', label: 'Misiones',        icon: Target,          group: 'Ir a', keywords: 'proyectos', run: () => go('/projects') },
      { id: 'go-ideas',    label: 'Ideas',           icon: Lightbulb,       group: 'Ir a', keywords: 'bóveda', run: () => go('/ideas') },
      { id: 'go-stats',    label: 'Telemetría',      icon: BarChart2,       group: 'Ir a', keywords: 'estadísticas rendimiento', run: () => go('/stats') },
      { id: 'go-achv',     label: 'Logros',          icon: Trophy,          group: 'Ir a', keywords: 'achievements insignias medallas', run: () => go('/achievements') },
      { id: 'go-music',    label: 'Música',          icon: Music,           group: 'Ir a', run: () => go('/music') },
      { id: 'go-settings', label: 'Configuración',   icon: Settings,        group: 'Ir a', keywords: 'ajustes sistemas', run: () => go('/settings') },
    ]
    const actions: Command[] = [
      { id: 'new-focus',   label: 'Iniciar sesión de Deep Work', icon: Zap,       group: 'Acciones', run: () => go('/focus') },
      { id: 'new-project', label: 'Nueva misión',                 icon: Plus,      group: 'Acciones', keywords: 'crear proyecto', run: () => { setIntent('new-project'); go('/projects') } },
      { id: 'new-idea',    label: 'Capturar una idea',            icon: Lightbulb, group: 'Acciones', keywords: 'nueva idea', run: () => go('/ideas') },
    ]
    const missions: Command[] = projects.slice(0, 8).map((p) => ({
      id: `mission-${p.id}`,
      label: p.name,
      hint: `${p.progress}%`,
      icon: Target,
      group: 'Misiones',
      keywords: p.goal,
      run: () => go(`/projects/${p.id}`),
    }))
    return [...actions, ...nav, ...missions]
  }, [projects]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) =>
      (c.label + ' ' + (c.keywords ?? '') + ' ' + c.group).toLowerCase().includes(q),
    )
  }, [query, commands])

  // Agrupar respetando orden de aparición
  const groups = useMemo(() => {
    const map = new Map<string, Command[]>()
    filtered.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group)!.push(c)
    })
    return Array.from(map.entries())
  }, [filtered])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[active]?.run()
    }
  }

  // Scroll al elemento activo
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  let runningIndex = -1

  return (
    <Modal open={commandOpen} onClose={() => setCommandOpen(false)} align="top" className="max-w-xl">
      {/* Buscador */}
      <div className="flex items-center gap-3 border-b border-glass-border px-4 py-3.5">
        <Search size={18} className="shrink-0 text-ink-ghost" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Buscar acciones, páginas o misiones…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-ghost"
        />
        <kbd className="hidden shrink-0 rounded border border-glass-border bg-white/5 px-1.5 py-0.5 font-data text-[10px] text-ink-ghost sm:block">
          ESC
        </kbd>
      </div>

      {/* Resultados */}
      <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-ink-ghost">Sin resultados para «{query}»</p>
        )}
        {groups.map(([group, cmds]) => (
          <div key={group} className="mb-1">
            <p className="px-2 py-1.5 font-data text-[10px] uppercase tracking-[0.2em] text-ink-ghost">
              {group}
            </p>
            {cmds.map((c) => {
              runningIndex++
              const idx = runningIndex
              const isActive = idx === active
              const Icon = c.icon
              return (
                <button
                  key={c.id}
                  data-idx={idx}
                  onClick={c.run}
                  onMouseEnter={() => setActive(idx)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    isActive ? 'bg-core/10 text-core' : 'text-ink-dim hover:bg-white/[0.04]',
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="font-data text-[11px] text-ink-ghost">{c.hint}</span>}
                  {isActive && <CornerDownLeft size={13} className="shrink-0 text-core" />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </Modal>
  )
}
