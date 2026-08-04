'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Check, X, Loader2, Flame, Gem, Trash2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'
import type { FriendUser } from '@/lib/friends'

interface Props {
  friends: FriendUser[]
  incoming: FriendUser[]
  outgoing: FriendUser[]
  isDemo: boolean
}

function initials(u: FriendUser): string {
  const base = (u.name || u.email || '?').trim()
  return base.slice(0, 1).toUpperCase()
}

export function FriendsClient({ friends, incoming, outgoing, isDemo }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, fn: () => PromiseLike<{ error: unknown; data?: unknown }>, ok?: (data: unknown) => string) {
    setBusy(key)
    try {
      const { error, data } = await fn()
      if (error) throw error
      if (ok) toast.success(ok(data))
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (isDbSetupError(err)) toast.error(DB_SETUP_MSG)
      else toast.error(msg || 'No se pudo completar la acción')
    } finally {
      setBusy(null)
    }
  }

  function addFriend(e: React.FormEvent) {
    e.preventDefault()
    const clean = email.trim()
    if (!clean) return
    run(
      'add',
      () => supabase.rpc('send_friend_request', { p_email: clean }),
      (data) => (data === 'accepted' ? '¡Ahora son amigos!' : 'Solicitud enviada'),
    ).then(() => setEmail(''))
  }

  if (isDemo) {
    return (
      <div className="forge-panel p-8 text-center">
        <p className="text-sm text-forge-ink-dim">
          Inicia sesión con una cuenta real (correo o Google) para agregar amigos.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Agregar por correo */}
      <form onSubmit={addFriend} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@detuamigo.com"
          className="flex-1 rounded-forge border border-forge-line bg-forge-surface px-4 py-2.5 text-sm text-forge-ink outline-none placeholder:text-forge-ink-faint focus:border-ember/50"
        />
        <button
          type="submit"
          disabled={busy === 'add'}
          className="flex items-center gap-2 rounded-forge bg-ember px-4 py-2.5 font-forge text-sm font-bold text-forge-canvas shadow-ember disabled:opacity-50"
        >
          {busy === 'add' ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          Agregar
        </button>
      </form>

      {/* Solicitudes entrantes */}
      {incoming.length > 0 && (
        <section>
          <h2 className="mb-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-ember">
            Solicitudes ({incoming.length})
          </h2>
          <div className="flex flex-col gap-2">
            {incoming.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-forge border border-ember/30 bg-forge-surface p-3">
                <Avatar u={u} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-forge text-sm font-semibold text-forge-ink">{u.name || 'Sin nombre'}</p>
                  <p className="truncate text-[12px] text-forge-ink-faint">{u.email}</p>
                </div>
                <button
                  onClick={() => run(`acc-${u.id}`, () => supabase.rpc('respond_friend_request', { p_from: u.id, p_accept: true }), () => 'Amigo agregado')}
                  disabled={busy !== null}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ember text-forge-canvas"
                  aria-label="Aceptar"
                >
                  {busy === `acc-${u.id}` ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                </button>
                <button
                  onClick={() => run(`rej-${u.id}`, () => supabase.rpc('respond_friend_request', { p_from: u.id, p_accept: false }))}
                  disabled={busy !== null}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-forge-line text-forge-ink-dim"
                  aria-label="Rechazar"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Amigos (mini-ranking por puntos) */}
      <section>
        <h2 className="mb-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
          Tus amigos ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <div className="rounded-forge border border-forge-line bg-forge-surface p-6 text-center text-sm text-forge-ink-faint">
            Aún no tienes amigos. Agrega a alguien por su correo. 👆
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 rounded-forge border border-forge-line bg-forge-surface p-3">
                <span className="w-5 text-center font-num text-sm font-bold text-forge-ink-faint">{i + 1}</span>
                <Avatar u={u} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-forge text-sm font-semibold text-forge-ink">{u.name || 'Sin nombre'}</p>
                  <p className="truncate text-[12px] text-forge-ink-faint">{u.email}</p>
                </div>
                <span className="flex items-center gap-1 font-num text-[12px] text-metal">
                  <Flame size={12} /> {u.streak ?? 0}
                </span>
                <span className="flex items-center gap-1 font-num text-[12px] text-ember">
                  <Gem size={12} /> {u.points ?? 0}
                </span>
                <button
                  onClick={() => run(`rm-${u.id}`, () => supabase.rpc('remove_friend', { p_friend: u.id }))}
                  disabled={busy !== null}
                  className="text-forge-ink-faint hover:text-red-400"
                  aria-label="Eliminar amigo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Solicitudes enviadas */}
      {outgoing.length > 0 && (
        <section>
          <h2 className="mb-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
            Pendientes de aceptar ({outgoing.length})
          </h2>
          <div className="flex flex-col gap-2">
            {outgoing.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-forge border border-forge-line bg-forge-surface p-3 opacity-80">
                <Avatar u={u} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-forge text-sm font-semibold text-forge-ink">{u.name || 'Sin nombre'}</p>
                  <p className="truncate text-[12px] text-forge-ink-faint">{u.email}</p>
                </div>
                <span className="flex items-center gap-1 font-num text-[11px] text-forge-ink-faint">
                  <Clock size={12} /> Enviada
                </span>
                <button
                  onClick={() => run(`cx-${u.id}`, () => supabase.rpc('remove_friend', { p_friend: u.id }))}
                  disabled={busy !== null}
                  className="text-forge-ink-faint hover:text-red-400"
                  aria-label="Cancelar"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Avatar({ u }: { u: FriendUser }) {
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-forge-line bg-forge-raised font-forge text-sm font-bold text-ember">
      {initials(u)}
    </span>
  )
}
