'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Check, Lock, Gem, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, Segmented } from '@/components/ui/primitives'
import { PointsPill } from '@/app/(app)/perfil/_components/RewardsStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'
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

// El gato es naranja. Los emojis no son naranjas de fábrica, así que lo
// teñimos con un filtro CSS.
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
  const [name, setName] = useState(pet?.name ?? 'Kai')
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
    setName(pet?.name ?? 'Kai')
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

  async function persistPet(next: typeof slots, nextName = name) {
    if (!canUse || !uid) return
    const { error } = await supabase
      .from('user_pet')
      .upsert({ user_id: uid, name: nextName, ...next }, { onConflict: 'user_id' })
    if (error) toast.error('No se pudo guardar tu mascota.')
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
      const { error } = await supabase.rpc('buy_store_item', { p_item: item.id })
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
    const next = { ...slots, pet_id: item.id }
    setSlots(next)
    void persistPet(next)
    toast.success(`${name} está listo.`)
  }

  async function onGearCard(item: PetItem) {
    const slotKey = SLOT[item.kind as Exclude<PetItemKind, 'pet'>]
    // Ya equipado → desequipar
    if (slots[slotKey] === item.id) {
      const next = { ...slots, [slotKey]: null }
      setSlots(next)
      void persistPet(next)
      return
    }
    const has = owned.has(item.id) || (await buy(item))
    if (!has) return
    const next = { ...slots, [slotKey]: item.id }
    setSlots(next)
    void persistPet(next)
  }

  function saveName() {
    setEditingName(false)
    const clean = name.trim() || 'Kai'
    setName(clean)
    void persistPet(slots, clean)
  }

  const visible = catalog.filter((i) => i.kind === tab)

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      {/* Escenario de la mascota */}
      <Card as="section" className="flex flex-col items-center gap-4 p-6 sm:p-8 lg:sticky lg:top-20">
        <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-line bg-sunken">
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
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                saveName()
              }}
            >
              <label htmlFor="pet-name" className="sr-only">
                Nombre de tu mascota
              </label>
              <input
                id="pet-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
                className="k-input w-40 text-center"
              />
              <Button type="submit" size="md" variant="secondary">
                Guardar
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              aria-label={`Cambiar el nombre de ${name}`}
              className="group flex items-center gap-2 rounded-control px-2 py-0.5 text-[20px] font-semibold tracking-[-0.015em] text-ink"
            >
              {name}
              <Pencil size={14} className="text-ink-faint group-hover:text-ink-dim" />
            </button>
          )
        ) : (
          <p className="text-[18px] font-semibold tracking-[-0.01em] text-ink">Adopta tu mascota</p>
        )}
        <p className="max-w-[16rem] text-center text-sm text-ink-dim">
          {petItem
            ? 'Tu compañero de enfoque. Vístelo con lo que ganas completando tareas.'
            : 'Elige una mascota para empezar. Las dos primeras son gratis.'}
        </p>
      </Card>

      {/* Tienda de la mascota */}
      <Card as="section">
        <CardHeader
          eyebrow="Armario"
          title="Mascotas y accesorios"
          action={<PointsPill points={points} isDeveloper={isDeveloper} />}
        />
        <div className="px-4 pt-3 sm:px-5">
          <Segmented label="Categoría" value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.key, label: t.label }))} size="sm" />
        </div>

        <ul className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 sm:p-5">
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
            const priced = !isOwned && !active && item.cost_points > 0 && !isDeveloper

            return (
              <li
                key={item.id}
                className={clsx(
                  'flex flex-col items-center gap-2 rounded-control border p-3.5 text-center transition-colors',
                  active ? 'border-accent-fg/40 bg-accent/10' : 'border-line bg-raised',
                )}
              >
                <span className="text-4xl leading-none" style={emojiStyle(item.emoji)} aria-hidden>
                  {item.emoji}
                </span>
                <p className="w-full truncate text-[13px] font-medium text-ink">{item.name}</p>
                <Button
                  size="sm"
                  variant={active ? 'ghost' : 'secondary'}
                  onClick={() => (isPet ? onPetCard(item) : onGearCard(item))}
                  disabled={(active && isPet) || locked}
                  loading={busy}
                  icon={
                    active ? (
                      <Check size={13} strokeWidth={2.6} />
                    ) : locked ? (
                      <Lock size={12} />
                    ) : priced ? (
                      <Gem size={12} />
                    ) : undefined
                  }
                  aria-label={active && !isPet ? `Quitar ${item.name}` : `${label}: ${item.name}`}
                  className={clsx('w-full', priced && 'font-mono', active && 'text-accent-fg')}
                >
                  {label}
                </Button>
              </li>
            )
          })}
        </ul>

        {isDemo && (
          <p className="border-t border-line px-4 py-3 text-xs text-ink-faint sm:px-5">
            Vista previa: inicia sesión con una cuenta para comprar con tus puntos reales.
          </p>
        )}
      </Card>
    </div>
  )
}
