'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Gem, Lock, Loader2, Search } from 'lucide-react'
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
        EQUIPPABLE.has(item.kind) ? `${item.name} comprado. ¡Equípalo en Focus Pet!` : `${item.name} desbloqueado`,
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
      {/* Puntos + búsqueda */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-forge border border-forge-line bg-forge-surface px-3">
          <Search size={16} className="text-forge-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en la tienda…"
            className="w-full bg-transparent py-2.5 text-sm text-forge-ink outline-none placeholder:text-forge-ink-faint"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-forge border border-forge-line bg-forge-surface px-3 py-2 text-sm">
          <Gem size={14} className={isDeveloper ? 'text-ember' : 'text-forge-ink-dim'} />
          <span className={`font-num font-semibold ${isDeveloper ? 'text-ember' : 'text-forge-ink'}`}>
            {isDeveloper ? INFINITE : displayPoints}
          </span>
        </div>
      </div>

      {/* Categorías */}
      {!q && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 font-forge text-sm font-semibold transition-colors ${
                tab === k ? 'bg-forge-raised text-forge-ink' : 'text-forge-ink-dim hover:text-forge-ink'
              }`}
            >
              {KIND_LABEL[k] ?? k}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {visible.map((item) => {
          const isOwned = owned.has(item.id)
          const busy = busyId === item.id
          const free = item.cost === 0
          const affordable = isDeveloper || free || displayPoints >= item.cost
          return (
            <button
              key={item.id}
              onClick={() => buy(item)}
              disabled={busy || isOwned}
              className={`flex flex-col items-center gap-1.5 rounded-forge border p-3 text-center transition-colors disabled:cursor-default ${
                isOwned ? 'border-metal/30 bg-metal/[0.06]' : 'border-forge-line bg-forge-surface hover:border-ember/50'
              }`}
            >
              <span className="text-3xl leading-none">{item.emoji}</span>
              <span className="line-clamp-1 w-full font-forge text-[11px] font-semibold text-forge-ink">
                {item.name}
              </span>
              <span
                className={`inline-flex items-center gap-1 font-num text-[11px] font-bold ${
                  isOwned ? 'text-metal' : affordable ? 'text-ember' : 'text-forge-ink-faint'
                }`}
              >
                {busy ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : isOwned ? (
                  <>
                    <Check size={11} strokeWidth={3} /> Tuyo
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
          )
        })}
      </div>

      {visible.length === 0 && (
        <p className="py-8 text-center text-sm text-forge-ink-faint">Sin resultados.</p>
      )}

      {isDemo && (
        <p className="text-center text-xs text-forge-ink-faint">
          Vista previa (demo): inicia sesión para comprar con tus puntos.
        </p>
      )}
    </div>
  )
}
