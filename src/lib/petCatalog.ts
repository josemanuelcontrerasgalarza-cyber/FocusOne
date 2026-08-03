import { STORE_CATALOG, EQUIPPABLE_KINDS } from '@/lib/storeCatalog'
import type { PetItem, PetItemKind } from '@/types'

/**
 * Catálogo de Focus Pet = subconjunto EQUIPABLE de la tienda (mascotas, gorros,
 * atuendos y accesorios). Fuente única: STORE_CATALOG. Así, comprar en la tienda
 * y equipar en la mascota usan exactamente el mismo id y costo.
 */
const equippable = new Set<string>(EQUIPPABLE_KINDS)

export const PET_CATALOG: PetItem[] = STORE_CATALOG.filter((i) => equippable.has(i.kind)).map(
  (i) => ({
    id: i.id,
    name: i.name,
    kind: i.kind as PetItemKind,
    cost_points: i.cost,
    emoji: i.emoji,
    created_at: '',
  }),
)
