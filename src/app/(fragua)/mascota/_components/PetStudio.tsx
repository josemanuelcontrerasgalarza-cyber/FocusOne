'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Lock, Gem, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'
import { INFINITE } from '@/lib/developer'
import type { PetItem, PetItemKind, UserPet } from '@/types'

interface Props {
  catalog: PetItem[]
  ownedIds: string[]
  pet: UserPet | null
  points: number
  isDeveloper: boolean
  isDemo: boolean
}

const TABS: { key: PetItemKind; label: string }[] = [
  { key: 'pet', label: 'Mascotas' },
  { key: 'hat', label: 'Gorros' },
  { key: 'outfit', label: 'Outfits' },
  { key: 'accessory', label: 'Accesorios' },
]

const SLOT: Record<Exclude<PetItemKind, 'pet'>, 'hat_id' | 'outfit_id' | 'accessory_id'> = {
  hat: 'hat_id',
  outfit: 'outfit_id',
  accessory: 'accessory_id',
}

// El gato es naranja (tono ember de La Fragua). Los emojis no son naranjas de
// fábrica, así que lo teñimos con un filtro CSS.
const CAT_FILTER = 'sepia(1) saturate(9) hue-rotate(-38deg) brightness(0.82) contrast(1.2)'
const emojiStyle = (emoji: string): React.CSSProperties | undefined =>
  emoji === '🐱' ? { filter: CAT_FILTER } : undefined

export function PetStudio({ catalog, ownedIds, pet, points: initialPoints, isDeveloper, isDemo }: Props) {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)
  const canUse = !isDemo && Boolean(uid)

  const byId = useMemo(() => new Map(catalog.map((i) => [i.id, i])), [catalog])

  const [owned, setOwned] = useState<Set<string>>(new Set(ownedIds))
  const [points, setPoints] = useState(initialPoints)
  const [name, setName] = useState(pet?.name ?? 'Ascua')
  const [editingName, setEditingName] = useState(false)
  const [slots, setSlots] = useState({
    pet_id: pet?.pet_id ?? null,
    hat_id: pet?.hat_id ?? null,
    outfit_id: pet?.outfit_id ?? null,
    accessory_id: pet?.accessory_id ?? null,
  })
  const [tab, setTab] = useState<PetItemKind>('pet')
  const [busyId, setBusyId] = useState<string | null>(null)

  // Reconcilia con el servidor cuando llegan props frescas (tras router.refresh()
  // o al volver a la pantalla): la verdad de puntos/posesión es la del servidor,
  // no el estado optimista local. Solo corre cuando cambian las props.
  useEffect(() => {
    setOwned(new Set(ownedIds))
    setPoints(initialPoints)
    setName(pet?.name ?? 'Ascua')
    setSlots({
      pet_id: pet?.pet_id ?? null,
      hat_id: pet?.hat_id ?? null,
      outfit_id: pet?.outfit_id ?? null,
      accessory_id: pet?.accessory_id ?? null,
    })
  }, [ownedIds, initialPoints, pet])

  const petItem = slots.pet_id ? byId.get(slots.pet_id) : null
  const hat = slots.hat_id ? byId.get(slots.hat_id) : null
  const outfit = slots.outfit_id ? byId.get(slots.outfit_id) : null
  const accessory = slots.accessory_id ? byId.get(slots.accessory_id) : null

  // Revierte al estado anterior si el guardado falla: sin esto, un equip/
  // unequip optimista (o un renombrado) que falla en el servidor se quedaba
  // "puesto" en pantalla hasta el próximo reload completo, aunque el
  // servidor nunca lo guardó.
  async function persistPet(next: typeof slots, prev: typeof slots, nextName = name, prevName = name) {
    if (!canUse || !uid) return
    const { error } = await supabase
      .from('user_pet')
      .upsert({ user_id: uid, name: nextName, ...next }, { onConflict: 'user_id' })
    if (error) {
      toast.error('No se pudo guardar tu mascota.')
      setSlots(prev)
      setName(prevName)
    }
  }

  async function buy(item: PetItem): Promise<boolean> {
    if (owned.has(item.id)) return true
    if (!isDeveloper && item.cost_points > points) {
      toast.error('Puntos insuficientes.')
      return false
    }
    if (!canUse) {
      if (item.cost_points > 0) {
        toast.info('Inicia sesión para comprar con puntos.')
        return false
      }
      // Demo: ítems gratis se pueden probar localmente.
      setOwned((s) => new Set(s).add(item.id))
      return true
    }
    setBusyId(item.id)
    try {
      const { error } = await supabase.rpc('buy_pet_item', { p_item: item.id })
      if (error) throw error
      setOwned((s) => new Set(s).add(item.id))
      if (!isDeveloper) setPoints((p) => p - item.cost_points) // dev: diamantes ∞
      if (item.cost_points > 0) toast.success(`Compraste: ${item.name}`)
      // Sincroniza el badge de puntos del header (vive en el layout servidor).
      router.refresh()
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('insuficientes')) toast.error('Puntos insuficientes.')
      else if (isDbSetupError(err)) toast.error(DB_SETUP_MSG)
      else toast.error('No se pudo comprar.')
      return false
    } finally {
      setBusyId(null)
    }
  }

  async function onPetCard(item: PetItem) {
    const has = owned.has(item.id) || (await buy(item))
    if (!has) return
    const prev = slots
    const next = { ...slots, pet_id: item.id }
    setSlots(next)
    void persistPet(next, prev)
    toast.success(`${name} está listo`)
  }

  async function onGearCard(item: PetItem) {
    const slotKey = SLOT[item.kind as Exclude<PetItemKind, 'pet'>]
    const prev = slots
    // Ya equipado → desequipar
    if (slots[slotKey] === item.id) {
      const next = { ...slots, [slotKey]: null }
      setSlots(next)
      void persistPet(next, prev)
      return
    }
    const has = owned.has(item.id) || (await buy(item))
    if (!has) return
    const next = { ...slots, [slotKey]: item.id }
    setSlots(next)
    void persistPet(next, prev)
  }

  function saveName() {
    setEditingName(false)
    const prevName = name
    const clean = name.trim() || 'Ascua'
    setName(clean)
    void persistPet(slots, slots, clean, prevName)
  }

  const visible = catalog.filter((i) => i.kind === tab)

  return (
    <div className="flex flex-col gap-8">
      {/* Escenario de la mascota */}
      <div className="forge-panel flex flex-col items-center gap-4 p-8">
        <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-forge-line bg-forge-canvas">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,106,43,0.12), transparent 70%)' }}
          />

          {/* Mascota base */}
          <span
            className="relative z-10 text-[84px] leading-none"
            style={petItem ? emojiStyle(petItem.emoji) : undefined}
          >
            {petItem ? petItem.emoji : '🥚'}
          </span>

          {/* Capa: DETRÁS de la mascota (como una capa real). */}
          {outfit?.id === 'capa' && (
            <span className="pointer-events-none absolute left-1/2 top-[46%] z-0 -translate-x-1/2 -translate-y-1/2 text-[92px] leading-none opacity-90">
              {outfit.emoji}
            </span>
          )}

          {/* Gorro / corona: encima de la cabeza. */}
          {petItem && hat && (
            <span className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 text-[44px] leading-none drop-shadow">
              {hat.emoji}
            </span>
          )}

          {/* Gafas: sobre la cara. Medalla: en el pecho. */}
          {petItem && accessory?.id === 'gafas' && (
            <span className="pointer-events-none absolute left-1/2 top-[38%] z-20 -translate-x-1/2 text-[34px] leading-none">
              {accessory.emoji}
            </span>
          )}
          {petItem && accessory?.id === 'medalla' && (
            <span className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 text-[30px] leading-none">
              {accessory.emoji}
            </span>
          )}

          {/* Bufanda: al cuello (parte baja del cuerpo). */}
          {petItem && outfit?.id === 'bufanda' && (
            <span className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 text-[34px] leading-none">
              {outfit.emoji}
            </span>
          )}
        </div>

        {petItem ? (
          editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="w-40 rounded-lg border border-forge-line bg-forge-canvas px-3 py-1.5 text-center font-forge text-forge-ink outline-none focus:border-ember/50"
              />
              <button onClick={saveName} className="rounded-full bg-ember px-3 py-1.5 text-xs font-bold text-forge-canvas">
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-2 font-forge text-xl font-bold text-forge-ink"
            >
              {name}
              <Pencil size={14} className="text-forge-ink-faint" />
            </button>
          )
        ) : (
          <p className="font-forge text-lg font-bold text-forge-ink">Adopta tu mascota</p>
        )}
        <p className="text-center text-sm text-forge-ink-dim">
          {petItem
            ? 'Tu compañero de enfoque. Vístelo con lo que ganes forjando misiones.'
            : 'Elige una mascota abajo para empezar. Las dos primeras son gratis.'}
        </p>
      </div>

      {/* Tienda Focus Pet */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
            Focus Pet · Tienda
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Gem size={14} className={isDeveloper ? 'text-ember' : 'text-forge-ink-dim'} />
            <span className={`font-num font-semibold ${isDeveloper ? 'text-ember' : 'text-forge-ink'}`}>
              {isDeveloper ? INFINITE : points}
            </span>
            <span className="text-forge-ink-faint">pts</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 font-forge text-sm font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-forge-raised text-forge-ink'
                  : 'text-forge-ink-dim hover:text-forge-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((item) => {
            const isOwned = owned.has(item.id)
            const isPet = item.kind === 'pet'
            const active = isPet
              ? slots.pet_id === item.id
              : slots[SLOT[item.kind as Exclude<PetItemKind, 'pet'>]] === item.id
            const affordable = isDeveloper || points >= item.cost_points
            const busy = busyId === item.id

            let label: string
            if (active) label = isPet ? 'En uso' : 'Equipado'
            else if (isOwned) label = isPet ? 'Elegir' : 'Equipar'
            else if (isDeveloper) label = 'Gratis'
            else if (!canUse && item.cost_points > 0) label = `${item.cost_points}`
            else if (affordable) label = item.cost_points === 0 ? 'Gratis' : `${item.cost_points}`
            else label = `Faltan ${item.cost_points - points}`

            const locked = !isOwned && !affordable && item.cost_points > 0

            return (
              <div
                key={item.id}
                className={`flex flex-col items-center gap-2 rounded-forge border p-4 text-center ${
                  active ? 'border-ember/40 bg-ember/[0.06]' : 'border-forge-line bg-forge-surface'
                }`}
              >
                <span className="text-4xl" style={emojiStyle(item.emoji)}>{item.emoji}</span>
                <p className="font-forge text-sm font-semibold text-forge-ink">{item.name}</p>
                <button
                  onClick={() => (isPet ? onPetCard(item) : onGearCard(item))}
                  disabled={busy || (active && isPet) || locked}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-forge text-xs font-bold transition-transform disabled:cursor-default ${
                    active
                      ? 'border border-ember/40 bg-ember/10 text-ember'
                      : isOwned
                        ? 'border border-forge-line text-forge-ink hover:-translate-y-px'
                        : locked
                          ? 'cursor-not-allowed border border-forge-line text-forge-ink-faint'
                          : 'bg-ember text-forge-canvas shadow-ember hover:-translate-y-px'
                  }`}
                >
                  {active ? (
                    <Check size={13} strokeWidth={3} />
                  ) : locked ? (
                    <Lock size={12} />
                  ) : !isOwned && item.cost_points > 0 ? (
                    <Gem size={12} />
                  ) : null}
                  {label}
                </button>
              </div>
            )
          })}
        </div>

        {isDemo && (
          <p className="mt-4 text-center text-xs text-forge-ink-faint">
            Vista previa (demo): inicia sesión para comprar con tus puntos reales.
          </p>
        )}
      </div>
    </div>
  )
}
