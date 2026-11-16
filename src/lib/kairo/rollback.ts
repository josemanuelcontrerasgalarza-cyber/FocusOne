/**
 * Reversión PRECISA de un cambio optimista.
 *
 * Antes, si una mutación fallaba, el store restauraba la foto completa tomada
 * al empezar. Con varias mutaciones en vuelo (p. ej. marcar tres tareas
 * seguidas, o «pasar vencidas a hoy») el fallo de UNA borraba también los
 * cambios de las demás, aunque el servidor sí los hubiera guardado: la UI
 * quedaba desincronizada.
 *
 * `revertCollection` deshace SOLO lo que cambió esa mutación (`before` → `after`)
 * sobre el estado actual, campo a campo, sin pisar cambios posteriores.
 */

type Row = Record<string, unknown>

export function revertCollection<T extends object>(
  current: readonly T[],
  before: readonly T[],
  after: readonly T[],
  key: (x: T) => string,
): T[] {
  const beforeMap = new Map(before.map((x) => [key(x), x]))
  const afterMap = new Map(after.map((x) => [key(x), x]))

  const out: T[] = []
  const seen = new Set<string>()
  for (const item of current) {
    const k = key(item)
    seen.add(k)
    const b = beforeMap.get(k)
    const a = afterMap.get(k)
    // Creado por esta mutación → se quita.
    if (!b && a) continue
    // Modificado por esta mutación → se restauran solo los campos que tocó,
    // y solo si nadie los ha vuelto a cambiar desde entonces.
    if (b && a && a !== b) {
      out.push(revertFields(item, b, a))
      continue
    }
    out.push(item)
  }
  // Borrado por esta mutación → vuelve (si nadie lo ha recreado).
  for (const [k, b] of beforeMap) {
    if (!afterMap.has(k) && !seen.has(k)) out.push(b)
  }
  return out
}

function revertFields<T extends object>(current: T, before: T, after: T): T {
  const cur = current as Row
  const b = before as Row
  const a = after as Row
  let next: Row | null = null
  for (const field of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (Object.is(a[field], b[field])) continue
    if (!Object.is(cur[field], a[field])) continue // cambiado después: se respeta
    next ??= { ...cur }
    if (field in b) next[field] = b[field]
    else delete next[field]
  }
  return (next ?? cur) as T
}
