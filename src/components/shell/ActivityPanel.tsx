'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Bell, AlertTriangle, CalendarClock, Trophy, Users, Sparkles, Check } from 'lucide-react'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { useWorkspace } from '@/store/workspace'
import { IconButton } from '@/components/ui/Button'
import { toDateKey } from '@/lib/kairo/dates'
import { dueBucket } from '@/lib/kairo/tasks'

interface Stored {
  id: string
  kind: string
  body: string
  read: boolean
  created_at: string
}

const SOCIAL = new Set(['friend_request', 'friend_accepted', 'challenge'])
const ACHIEVE = new Set(['goal_achieved', 'project_completed', 'milestone'])

function iconFor(kind: string) {
  if (SOCIAL.has(kind)) return <Users size={14} />
  if (kind === 'goal_achieved' || kind === 'project_completed') return <Trophy size={14} />
  if (kind === 'milestone') return <Sparkles size={14} />
  return <Bell size={14} />
}

function timeago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return `hace ${Math.floor(s / 86400)} d`
}

/**
 * Bandeja de actividad: notificaciones guardadas (amigos, logros, hitos) +
 * recordatorios CALCULADOS de vencimientos (no se guardan → no se repiten).
 */
export function ActivityPanel() {
  const router = useRouter()
  const { tasks, settings, mode, userId } = useWorkspace()
  const [items, setItems] = useState<Stored[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const canStore = supabaseConfigured && mode === 'cloud' && Boolean(userId)

  const load = useCallback(async () => {
    if (!canStore) return
    const { data, error } = await supabase
      .from('notifications')
      .select('id, kind, body, read, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
    if (!error) setItems((data ?? []) as Stored[])
  }, [canStore])

  useEffect(() => {
    void load()
    if (!canStore) return
    const t = setInterval(() => void load(), 90_000)
    return () => clearInterval(t)
  }, [load, canStore])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  }, [open])

  const today = toDateKey(new Date())
  const reminders = useMemo(() => {
    if (!settings.notifications.dueReminders) return []
    const open = tasks.filter((t) => t.status !== 'completed')
    const overdue = open.filter((t) => dueBucket(t, today) === 'overdue').length
    const dueToday = open.filter((t) => dueBucket(t, today) === 'today').length
    const out: { key: string; icon: React.ReactNode; text: string; href: string; tone: string }[] = []
    if (overdue)
      out.push({
        key: 'overdue',
        icon: <AlertTriangle size={14} />,
        text: overdue === 1 ? '1 tarea vencida' : `${overdue} tareas vencidas`,
        href: '/tareas?vence=vencidas',
        tone: 'text-danger',
      })
    if (dueToday)
      out.push({
        key: 'today',
        icon: <CalendarClock size={14} />,
        text: dueToday === 1 ? '1 tarea vence hoy' : `${dueToday} tareas vencen hoy`,
        href: '/tareas?vence=hoy',
        tone: 'text-accent-fg',
      })
    return out
  }, [tasks, settings.notifications.dueReminders, today])

  const visible = items.filter(
    (n) =>
      (settings.notifications.social || !SOCIAL.has(n.kind)) &&
      (settings.notifications.achievements || !ACHIEVE.has(n.kind)),
  )
  const unread = visible.filter((n) => !n.read).length + reminders.length

  async function toggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && canStore && visible.some((n) => !n.read)) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId as string).eq('read', false)
      setItems((l) => l.map((n) => ({ ...n, read: true })))
    }
  }

  async function clearAll() {
    if (!canStore) return
    await supabase.from('notifications').delete().eq('user_id', userId as string)
    setItems([])
  }

  return (
    <div className="relative" ref={ref}>
      <IconButton label={unread ? `Actividad: ${unread} sin leer` : 'Actividad'} onClick={toggle} active={open}>
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-fg ring-2 ring-canvas" aria-hidden />
        )}
      </IconButton>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[340px] max-w-[calc(100vw-24px)] animate-scale-in overflow-hidden rounded-card border border-line bg-raised shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-sm font-semibold text-ink">Actividad</p>
            {visible.length > 0 && (
              <button onClick={clearAll} className="text-xs text-ink-faint hover:text-ink">
                Borrar todo
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {reminders.map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setOpen(false)
                  router.push(r.href)
                }}
                className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left hover:bg-sunken"
              >
                <span className={clsx('flex h-7 w-7 items-center justify-center rounded-full bg-sunken', r.tone)}>{r.icon}</span>
                <span className="flex-1 text-sm text-ink">{r.text}</span>
                <span className="text-xs text-ink-faint">Ver</span>
              </button>
            ))}
            {visible.map((n) => (
              <div key={n.id} className="flex gap-3 border-b border-line px-4 py-3 last:border-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-dim">
                  {iconFor(n.kind)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-ink">{n.body}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-faint">{timeago(n.created_at)}</p>
                </div>
              </div>
            ))}
            {reminders.length === 0 && visible.length === 0 && (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-sunken text-ink-dim">
                  <Check size={16} />
                </span>
                <p className="text-sm font-medium text-ink">Todo al día</p>
                <p className="mt-0.5 text-xs text-ink-dim">Aquí verás vencimientos, logros y avisos de tus amigos.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
