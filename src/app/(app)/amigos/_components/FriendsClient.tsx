'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Check, X, Flame, Gem, Trash2, Clock, Swords, Users } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Avatar, Card, CardHeader, EmptyState, Field } from '@/components/ui/primitives'
import { confirm } from '@/components/ui/Overlay'
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
      (data) => (data === 'accepted' ? 'Ahora son amigos' : 'Solicitud enviada'),
    ).then(() => setEmail(''))
  }

  async function removeFriend(u: FriendUser) {
    const ok = await confirm({
      title: `¿Eliminar a ${u.name || u.email}?`,
      description: 'Dejarán de ver su racha y puntos. Pueden volver a agregarse cuando quieran.',
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (ok) run(`rm-${u.id}`, () => supabase.rpc('remove_friend', { p_friend: u.id }), () => 'Amigo eliminado')
  }

  if (isDemo) {
    return (
      <Card>
        <EmptyState
          icon={<Users size={18} />}
          title="Amigos necesita una cuenta"
          description="Entra con tu correo o con Google para agregar amigos y comparar su progreso."
          action={
            <Link
              href="/login?next=/amigos"
              className="inline-flex h-9 items-center rounded-control border border-line bg-raised px-3.5 text-sm font-medium text-ink transition-colors hover:border-line-strong"
            >
              Entrar
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        {/* Solicitudes entrantes */}
        {incoming.length > 0 && (
          <Card as="section">
            <CardHeader eyebrow="Pendientes" title={`Solicitudes (${incoming.length})`} />
            <ul className="divide-y divide-line px-1.5 pb-1.5 pt-1">
              {incoming.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-2.5 py-2.5">
                  <Avatar name={u.name || u.email} size={34} />
                  <Who u={u} />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      run(`acc-${u.id}`, () => supabase.rpc('respond_friend_request', { p_from: u.id, p_accept: true }), () => 'Amigo agregado')
                    }
                    disabled={busy !== null}
                    loading={busy === `acc-${u.id}`}
                    icon={<Check size={14} />}
                  >
                    Aceptar
                  </Button>
                  <IconButton
                    label={`Rechazar a ${u.name || u.email}`}
                    size="sm"
                    onClick={() => run(`rej-${u.id}`, () => supabase.rpc('respond_friend_request', { p_from: u.id, p_accept: false }))}
                    disabled={busy !== null}
                  >
                    <X size={15} />
                  </IconButton>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Amigos (mini-ranking por puntos) */}
        <Card as="section">
          <CardHeader eyebrow="Ranking" title={`Tus amigos (${friends.length})`} />
          {friends.length === 0 ? (
            <EmptyState
              compact
              icon={<Users size={18} />}
              title="Aún no has agregado a nadie"
              description="Escribe el correo de un amigo en el formulario para enviarle una solicitud."
            />
          ) : (
            <ul className="divide-y divide-line px-1.5 pb-1.5 pt-1">
              {friends.map((u, i) => (
                <li key={u.id} className="flex items-center gap-3 px-2.5 py-2.5">
                  <span className="w-4 text-center font-mono text-[12px] text-ink-faint">{i + 1}</span>
                  <Avatar name={u.name || u.email} size={34} />
                  <Who u={u} />
                  <span className="hidden items-center gap-3 font-mono text-[12px] text-ink-dim min-[420px]:flex">
                    <span className="inline-flex items-center gap-1" title="Racha">
                      <Flame size={12} className="text-warm" /> {u.streak ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1" title="Puntos">
                      <Gem size={12} /> {u.points ?? 0}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      run(`ch-${u.id}`, () => supabase.rpc('challenge_friend', { p_friend: u.id }), () => `Has retado a ${u.name || 'tu amigo'}`)
                    }
                    disabled={busy !== null}
                    loading={busy === `ch-${u.id}`}
                    icon={<Swords size={13} />}
                    aria-label={`Retar a ${u.name || u.email}`}
                  >
                    <span className="hidden sm:inline">Retar</span>
                  </Button>
                  <IconButton label={`Eliminar a ${u.name || u.email}`} size="sm" onClick={() => removeFriend(u)} disabled={busy !== null}>
                    <Trash2 size={14} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {/* Agregar por correo */}
        <Card as="section" className="p-4 sm:p-5">
          <form onSubmit={addFriend} className="flex flex-col gap-3">
            <Field label="Agregar por correo" htmlFor="friend-email" hint="Recibirá una solicitud y podrá aceptarla.">
              <input
                id="friend-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@deturamigo.com"
                className="k-input"
              />
            </Field>
            <Button type="submit" variant="secondary" loading={busy === 'add'} icon={<UserPlus size={15} />}>
              Enviar solicitud
            </Button>
          </form>
        </Card>

        {/* Solicitudes enviadas */}
        {outgoing.length > 0 && (
          <Card as="section">
            <CardHeader eyebrow="Enviadas" title={`Esperando respuesta (${outgoing.length})`} />
            <ul className="divide-y divide-line px-1.5 pb-1.5 pt-1">
              {outgoing.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-2.5 py-2.5">
                  <Avatar name={u.name || u.email} size={30} />
                  <Who u={u} />
                  <Clock size={13} className="shrink-0 text-ink-faint" aria-label="Pendiente" />
                  <IconButton
                    label={`Cancelar la solicitud a ${u.name || u.email}`}
                    size="sm"
                    onClick={() => run(`cx-${u.id}`, () => supabase.rpc('remove_friend', { p_friend: u.id }))}
                    disabled={busy !== null}
                  >
                    <X size={14} />
                  </IconButton>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}

function Who({ u }: { u: FriendUser }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-ink">{u.name || 'Sin nombre'}</p>
      <p className="truncate text-xs text-ink-faint">{u.email}</p>
    </div>
  )
}
