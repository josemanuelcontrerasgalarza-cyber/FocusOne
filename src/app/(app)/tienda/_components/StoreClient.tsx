'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Check, Gem, Lock, Loader2, Search } from 'lucide-react'
import { Card, EmptyState } from '@/components/ui/primitives'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'
import { INFINITE } from '@/lib/developer'
import type { StoreItem } from '@/types'

interface Props {
  catalog: StoreItem[]
  ownedIds: string[]
  points: number
  isDeveloper: boolean
  isDemo: boolean
}

const KIND_LABEL: Record<string, string> = {
  pet: 'Mascotas',
  hat: 'Gorros',
  outfit: 'Atuendos',
  accessory: 'Accesorios',
  aura: 'Auras',
  fondo: 'Fondos',
  insignia: 'Insignias',
  comida: 'Comida',
  planta: 'Plantas',
  deporte: 'Deporte',
  musica: 'Música',
  objeto: 'Objetos',
  vehiculo: 'Vehículos',
  simbolo: 'Símbolos',
}
const ORDER = Object.keys(KIND_LABEL)
const EQUIPPABLE = new Set(['pet', 'hat', 'outfit', 'accessory'])

export function StoreClient({ catalog, ownedIds, points, isDeveloper, isDemo }: Props) {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)
  const canUse = !isDemo && Boolean(uid)

  const [busyId, setBusyId] = useState<string | null>(null)
  const [extraOwned, setExtraOwned] = useState<Set<string>>(new Set())
  const [spent, setSpent] = useState(0)
  const [query, setQuery] = useState('')

  const kinds = useMemo(() => {
    const present = new Set(catalog.map((i) => i.kind))
    return ORDER.filter((k) => present.has(k))
  }, [catalog])
  const [tab, setTab] = useState<string>(kinds[0] ?? 'pet')

  useEffect(() => {
    setExtraOwned(new Set())
    setSpent(0)
  }, [ownedIds, points])

  const owned = useMemo(() => new Set([...ownedIds, ...extraOwned]), [ownedIds, extraOwned])
  const displayPoints = Math.max(0, points - spent)

  const q = query.trim().toLowerCase()
  const visible = useMemo(() => {
    if (q) return catalog.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 120)
    return catalog.filter((i) => i.kind === tab)
  }, [catalog, tab, q])

  async function buy(item: StoreItem) {
    if (owned.has(item.id)) return
    if (!canUse) {
      toast.info('Inicia sesión para comprar con puntos.')
      return
    }
    if (!isDeveloper && displayPoints < item.cost) {
      toast.error('Puntos insuficientes.')
      return
    }
    setBusyId(item.id)
    try {
      const { error } = await supabase.rpc('buy_store_item', { p_item: item.id })
      if (error) throw error
      setExtraOwned((s) => new Set(s).add(item.id))
      if (!isDeveloper) setSpent((s) => s + item.cost)
      toast.success(
        EQUIPPABLE.has(item.kind) ? `${item.name} es tuyo. Equípalo en Mascota.` : `${item.name} desbloqueado`,
      )
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('insuficientes')) toast.error('Puntos insuficientes.')
      else if (isDbSetupError(err)) toast.error(DB_SETUP_MSG)
      else toast.error('No se pudo comprar.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Búsqueda + puntos */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en la tienda…"
            aria-label="Buscar en la tienda"
            className="k-input h-10 pl-9"
          />
        </div>
        <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[13px] text-ink-dim">
          <Gem size={14} />
          <span className="font-mono font-medium text-ink">{isDeveloper ? INFINITE : displayPoints}</span>
          <span className="hidden text-ink-faint min-[400px]:inline">pts</span>
        </span>
      </div>

      {/* Categorías */}
      {!q && (
        <div role="tablist" aria-label="Categorías" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {kinds.map((k) => {
            const active = tab === k
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(k)}
                className={clsx(
                  'h-8 shrink-0 rounded-control border px-3 text-[13px] font-medium transition-colors',
                  active
                    ? 'border-line bg-raised text-ink shadow-card'
                    : 'border-transparent text-ink-dim hover:bg-sunken hover:text-ink',
                )}
              >
                {KIND_LABEL[k] ?? k}
              </button>
            )
          })}
        </div>
      )}

      {/* Cuadrícula */}
      {visible.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {visible.map((item) => {
            const isOwned = owned.has(item.id)
            const busy = busyId === item.id
            const free = item.cost === 0
            const affordable = isDeveloper || free || displayPoints >= item.cost
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => buy(item)}
                  disabled={busy || isOwned}
                  aria-label={
                    isOwned ? `${item.name}: ya es tuyo` : free ? `${item.name}: gratis` : `Comprar ${item.name} por ${item.cost} puntos`
                  }
                  className={clsx(
                    'flex h-full w-full flex-col items-center gap-1.5 rounded-card border p-3 text-center transition-colors disabled:cursor-default',
                    isOwned
                      ? 'border-success/25 bg-success/[0.06]'
                      : 'border-line bg-surface hover:border-line-strong hover:bg-raised',
                  )}
                >
                  <span className="text-[30px] leading-none" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="line-clamp-1 w-full text-[12px] font-medium text-ink">{item.name}</span>
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 font-mono text-[11px]',
                      isOwned ? 'text-success' : affordable ? 'text-ink-dim' : 'text-ink-faint',
                    )}
                  >
                    {busy ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : isOwned ? (
                      <>
                        <Check size={11} strokeWidth={2.6} /> Tuyo
                      </>
                    ) : free ? (
                      'Gratis'
                    ) : affordable ? (
                      <>
                        <Gem size={10} /> {item.cost}
                      </>
                    ) : (
                      <>
                        <Lock size={10} /> {item.cost}
                      </>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <Card>
          <EmptyState
            compact
            icon={<Search size={17} />}
            title="Sin resultados"
            description={q ? `No hay ítems que coincidan con “${query.trim()}”. Prueba con otra palabra.` : 'Esta categoría está vacía.'}
          />
        </Card>
      )}

      {isDemo && (
        <p className="text-center text-xs text-ink-faint">Vista previa: inicia sesión con una cuenta para comprar con tus puntos.</p>
      )}
    </div>
  )
}
