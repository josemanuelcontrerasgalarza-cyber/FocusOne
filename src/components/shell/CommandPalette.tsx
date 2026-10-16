'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import {
  Plus,
  Timer,
  FolderPlus,
  Target,
  SunMoon,
  Keyboard,
  Sparkles,
  Search,
  CheckSquare,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react'
import { Modal } from '@/components/ui/Overlay'
import { Kbd } from '@/components/ui/primitives'
import { useUI } from '@/store/uiStore'
import { useWorkspace } from '@/store/workspace'
import { useTheme } from '@/store/themeStore'
import { matchesQuery } from '@/lib/kairo/tasks'
import { colorHex } from '@/lib/colors'
import { ALL_NAV } from './nav'

interface Cmd {
  id: string
  group: string
  label: string
  hint?: string
  icon?: LucideIcon
  dot?: string
  keywords?: string
  shortcut?: string
  run: () => void
}

const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function CommandPalette() {
  const router = useRouter()
  const { paletteOpen, setPalette, openCapture, setShortcuts, openTask } = useUI()
  const { tasks, projects } = useWorkspace()
  const { mode, setMode } = useTheme()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (paletteOpen) {
      setQ('')
      setActive(0)
    }
  }, [paletteOpen])

  const go = (href: string) => {
    setPalette(false)
    router.push(href)
  }

  const commands = useMemo<Cmd[]>(() => {
    const base: Cmd[] = [
      { id: 'new-task', group: 'Acciones', label: 'Nueva tarea', icon: Plus, shortcut: 'N', keywords: 'crear añadir tarea', run: () => openCapture() },
      { id: 'focus', group: 'Acciones', label: 'Iniciar sesión de enfoque', icon: Timer, shortcut: 'F', keywords: 'pomodoro concentrar timer', run: () => go('/enfoque') },
      { id: 'new-project', group: 'Acciones', label: 'Nuevo proyecto', icon: FolderPlus, keywords: 'crear proyecto', run: () => go('/proyectos?nuevo=1') },
      { id: 'new-goal', group: 'Acciones', label: 'Nuevo objetivo o hábito', icon: Target, keywords: 'meta habito crear', run: () => go('/objetivos?nuevo=1') },
      { id: 'plan', group: 'Acciones', label: 'Planificar mi día con el asistente', icon: Sparkles, keywords: 'ia plan dia', run: () => go('/asistente?prompt=plan') },
      {
        id: 'theme',
        group: 'Acciones',
        label: mode === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
        icon: SunMoon,
        keywords: 'tema claro oscuro apariencia',
        run: () => {
          setMode(mode === 'dark' ? 'light' : 'dark')
          setPalette(false)
        },
      },
      {
        id: 'shortcuts',
        group: 'Acciones',
        label: 'Ver atajos de teclado',
        icon: Keyboard,
        shortcut: '?',
        keywords: 'teclado ayuda',
        run: () => {
          setPalette(false)
          setShortcuts(true)
        },
      },
      ...ALL_NAV.map<Cmd>((n) => ({
        id: `nav-${n.href}`,
        group: 'Ir a',
        label: n.label,
        icon: n.icon,
        shortcut: n.key ? `G ${n.key.toUpperCase()}` : undefined,
        run: () => go(n.href),
      })),
    ]
    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const results = useMemo(() => {
    const needle = strip(q.trim())
    const cmds = needle
      ? commands.filter((c) => strip(`${c.label} ${c.keywords ?? ''} ${c.group}`).includes(needle))
      : commands.filter((c) => c.group === 'Acciones' || c.id.startsWith('nav-'))
    const taskHits: Cmd[] = needle
      ? tasks
          .filter((t) => t.status !== 'completed' && matchesQuery(t, q))
          .slice(0, 6)
          .map((t) => ({ id: `task-${t.id}`, group: 'Tareas', label: t.title, icon: CheckSquare, run: () => openTask(t.id) }))
      : []
    const projHits: Cmd[] = needle
      ? projects
          .filter((p) => strip(p.name).includes(needle))
          .slice(0, 4)
          .map((p) => ({ id: `proj-${p.id}`, group: 'Proyectos', label: p.name, icon: FolderKanban, dot: colorHex(p.color), run: () => go(`/proyectos/${p.id}`) }))
      : []
    const createHit: Cmd[] =
      needle && !cmds.length && !taskHits.length
        ? [{ id: 'create-from-q', group: 'Acciones', label: `Crear tarea «${q.trim()}»`, icon: Plus, run: () => openCapture() }]
        : []
    return [...createHit, ...taskHits, ...projHits, ...cmds]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, commands, tasks, projects])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (c: Cmd | undefined) => {
    if (!c) return
    c.run()
  }

  let lastGroup = ''
  return (
    <Modal open={paletteOpen} onClose={() => setPalette(false)} size="md">
      <div className="-mx-5 -my-3">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search size={16} className="text-ink-faint" />
          <input
            data-autofocus
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(results.length - 1, a + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(0, a - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                run(results[active])
              }
            }}
            placeholder="Busca tareas, proyectos o escribe un comando…"
            aria-label="Buscar comandos"
            role="combobox"
            aria-expanded="true"
            aria-controls="kairo-palette-list"
            className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} id="kairo-palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink-faint">Sin resultados</p>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null
            lastGroup = c.group
            const Icon = c.icon
            return (
              <div key={c.id}>
                {header && <p className="k-eyebrow px-2.5 pb-1 pt-2.5">{header}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  data-idx={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(c)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-sm',
                    i === active ? 'bg-sunken text-ink' : 'text-ink-dim',
                  )}
                >
                  {c.dot ? (
                    <span className="mx-[3px] h-2.5 w-2.5 rounded-full" style={{ background: c.dot }} />
                  ) : (
                    Icon && <Icon size={16} className={i === active ? 'text-ink' : 'text-ink-faint'} />
                  )}
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {c.shortcut && <span className="font-mono text-[11px] text-ink-faint">{c.shortcut}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
