'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Flame,
  Target,
  TrendingUp,
  User,
  Plus,
  Music,
  Zap,
  Gift,
  Search,
  CornerDownLeft,
  type LucideIcon,
} from 'lucide-react'

interface Cmd {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  group: string
  keywords?: string
  href: string
}

const COMMANDS: Cmd[] = [
  { id: 'hoy', label: 'Ir a Hoy', icon: Flame, group: 'Navegar', href: '/hoy', keywords: 'dashboard mision timer' },
  { id: 'misiones', label: 'Ir a Misiones', icon: Target, group: 'Navegar', href: '/misiones', keywords: 'crud lista' },
  { id: 'progreso', label: 'Ir a Progreso', icon: TrendingUp, group: 'Navegar', href: '/progreso', keywords: 'racha puntos' },
  { id: 'perfil', label: 'Ir a Perfil', icon: User, group: 'Navegar', href: '/perfil', keywords: 'cuenta ajustes' },
  { id: 'nueva', label: 'Nueva misión', hint: 'Crear', icon: Plus, group: 'Acciones', href: '/misiones', keywords: 'crear add' },
  { id: 'deep', label: 'Deep Work', hint: 'Temporizador de enfoque', icon: Zap, group: 'Acciones', href: '/deep-work', keywords: 'foco timer pomodoro concentracion' },
  { id: 'musica', label: 'Música', hint: 'Frecuencias de foco', icon: Music, group: 'Acciones', href: '/musica', keywords: 'spotify playlist sonido' },
  { id: 'tienda', label: 'Recompensas', hint: 'Tienda', icon: Gift, group: 'Acciones', href: '/perfil', keywords: 'tienda puntos desbloquear premios' },
]

/** Evento global para abrir la paleta desde un botón del header. */
export const FORGE_COMMAND_EVENT = 'forge-command-open'

export function ForgeCommand() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K + evento del header
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(FORGE_COMMAND_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(FORGE_COMMAND_EVENT, onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter((c) =>
      `${c.label} ${c.keywords ?? ''} ${c.group}`.toLowerCase().includes(q),
    )
  }, [query])

  function run(cmd: Cmd) {
    setOpen(false)
    router.push(cmd.href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = results[active]
      if (cmd) run(cmd)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-forge border border-forge-line bg-forge-surface shadow-ember">
        {/* Búsqueda */}
        <div className="flex items-center gap-3 border-b border-forge-line px-4 py-3.5">
          <Search size={18} className="text-forge-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar un comando…"
            className="flex-1 bg-transparent font-forge text-[15px] text-forge-ink outline-none placeholder:text-forge-ink-faint"
          />
          <kbd className="rounded border border-forge-line px-1.5 py-0.5 font-num text-[10px] text-forge-ink-faint">
            ESC
          </kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-forge-ink-faint">
              Sin resultados
            </p>
          ) : (
            results.map((cmd, i) => {
              const Icon = cmd.icon
              const isActive = i === active
              return (
                <button
                  key={cmd.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(cmd)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive ? 'bg-forge-raised' : ''
                  }`}
                >
                  <Icon
                    size={17}
                    className={isActive ? 'text-ember' : 'text-forge-ink-faint'}
                  />
                  <span className="flex-1 font-forge text-[15px] text-forge-ink">
                    {cmd.label}
                  </span>
                  {cmd.hint && (
                    <span className="text-xs text-forge-ink-faint">{cmd.hint}</span>
                  )}
                  {isActive && (
                    <CornerDownLeft size={14} className="text-forge-ink-faint" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
