/**
 * Límite de peticiones en memoria con ventana deslizante. Suficiente para una
 * instancia; en despliegues con varias instancias cada una lleva su cuenta.
 */
export interface RateLimitResult {
  ok: boolean
  remaining: number
  /** segundos hasta que se libere un hueco (0 si ok) */
  retryAfterSec: number
}

export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number; maxKeys?: number }) {
  const { limit, windowMs } = opts
  const now = opts.now ?? Date.now
  const maxKeys = opts.maxKeys ?? 5000
  const hits = new Map<string, number[]>()

  function prune(t: number) {
    for (const [k, list] of hits) {
      const fresh = list.filter((x) => t - x < windowMs)
      if (fresh.length) hits.set(k, fresh)
      else hits.delete(k)
    }
  }

  return {
    check(key: string): RateLimitResult {
      const t = now()
      if (hits.size > maxKeys) prune(t)
      const list = (hits.get(key) ?? []).filter((x) => t - x < windowMs)
      if (list.length >= limit) {
        hits.set(key, list)
        return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((list[0] + windowMs - t) / 1000)) }
      }
      list.push(t)
      hits.set(key, list)
      return { ok: true, remaining: limit - list.length, retryAfterSec: 0 }
    },
    reset() {
      hits.clear()
    },
  }
}
