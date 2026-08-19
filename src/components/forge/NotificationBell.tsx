'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

interface Notif {
  id: string
  kind: string
  body: string
  read: boolean
  created_at: string
}

function icon(kind: string): string {
  if (kind === 'friend_request') return '👋'
  if (kind === 'friend_accepted') return '✅'
  if (kind === 'challenge') return '🔥'
  return '🔔'
}

function timeago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return `hace ${Math.floor(s / 86400)} d`
}

/**
 * Campana de notificaciones. Lee las notificaciones propias (RLS select own),
 * muestra el contador de no leídas y, al abrir, las marca como leídas. Si la
 * tabla aún no existe (setup sin correr) o no hay sesión real, no se renderiza.
 */
export function NotificationBell() {
  const uid = useAuthStore((s) => s.session?.user?.id)
  const isDemo = useAuthStore((s) => s.isDemo)
  const [items, setItems] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!uid) return
    const { data, error } = await supabase
      .from('notifications')
      .select('id, kind, body, read, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) {
      setAvailable(false)
      return
    }
    setItems((data ?? []) as Notif[])
  }, [uid])

  useEffect(() => {
    if (uid && !isDemo) void load()
  }, [uid, isDemo, load])

  useEffect(() => {
    if (!uid || isDemo) return
    const t = setInterval(() => void load(), 60000)
    return () => clearInterval(t)
  }, [uid, isDemo, load])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const unread = items.filter((i) => !i.read).length

  async function toggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && unread > 0 && uid) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false)
      setItems((list) => list.map((i) => ({ ...i, read: true })))
    }
  }

  async function clearAll() {
    if (!uid) return
    await supabase.from('notifications').delete().eq('user_id', uid)
    setItems([])
  }

  if (!uid || isDemo || !available) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-forge-line bg-forge-surface text-forge-ink-dim transition-colors hover:text-forge-ink"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 font-num text-[10px] font-bold text-forge-canvas">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[85vw] overflow-hidden rounded-forge border border-forge-line bg-forge-canvas shadow-ember">
          <div className="flex items-center justify-between border-b border-forge-line px-3 py-2">
            <span className="font-num text-[11px] uppercase tracking-[0.14em] text-forge-ink-faint">
              Notificaciones
            </span>
            {items.length > 0 && (
              <button onClick={clearAll} className="font-num text-[11px] text-forge-ink-faint hover:text-forge-ink">
                Borrar todo
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-5 text-center text-sm text-forge-ink-faint">Sin notificaciones</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="flex gap-2.5 border-b border-forge-line/50 px-3 py-2.5 last:border-0">
                  <span className="mt-0.5 text-base leading-none">{icon(n.kind)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-forge-ink">{n.body}</p>
                    <p className="mt-0.5 font-num text-[10px] text-forge-ink-faint">{timeago(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
