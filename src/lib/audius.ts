import 'server-only'

/**
 * Cliente de Audius (https://audius.org): streaming de música LEGAL, gratis y
 * SIN ANUNCIOS, con API pública sin clave. Lo llamamos desde el SERVIDOR (route
 * handlers) para no exponer los nodos ni ampliar la CSP del navegador: el
 * cliente solo habla con /api/music/* de nuestro propio origen.
 */
const APP = 'FocusOne'
let cachedHost: { host: string; at: number } | null = null

/** Tiempo máximo por llamada a Audius: un nodo colgado no debe bloquear la función. */
const TIMEOUT_MS = 8000

/** Solo URLs https:// sin credenciales ni ruta: el host llega de una lista externa. */
export function isSafeHost(h: unknown): h is string {
  if (typeof h !== 'string' || h.length > 200) return false
  try {
    const u = new URL(h)
    return u.protocol === 'https:' && !u.username && !u.password && (u.pathname === '/' || u.pathname === '') && !u.search && !u.hash
  } catch {
    return false
  }
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Audius ${res.status}`)
  return (await res.json()) as T
}

async function getHost(): Promise<string> {
  if (cachedHost && Date.now() - cachedHost.at < 10 * 60 * 1000) return cachedHost.host
  const json = await getJSON<{ data?: unknown[] }>('https://api.audius.co')
  const hosts = (json.data ?? []).filter(isSafeHost).map((h) => h.replace(/\/$/, ''))
  if (!hosts.length) throw new Error('Sin nodos Audius disponibles')
  // Elige entre los primeros nodos sanos (la lista viene ordenada por salud).
  const host = hosts[Math.floor(Math.random() * Math.min(hosts.length, 5))]
  cachedHost = { host, at: Date.now() }
  return host
}

export interface AudiusTrack {
  id: string
  title: string
  artist: string
  artwork: string | null
  duration: number
  streamUrl: string
}

type RawTrack = {
  id: string
  title?: string
  duration?: number
  is_streamable?: boolean
  user?: { name?: string }
  artwork?: Record<string, string>
}

function normalize(host: string, t: RawTrack): AudiusTrack {
  return {
    id: String(t.id),
    title: t.title ?? 'Sin título',
    artist: t.user?.name ?? 'Artista',
    artwork: t.artwork?.['480x480'] ?? t.artwork?.['150x150'] ?? null,
    duration: t.duration ?? 0,
    streamUrl: `${host}/v1/tracks/${encodeURIComponent(String(t.id))}/stream?app_name=${APP}`,
  }
}

export async function trending(limit = 30): Promise<AudiusTrack[]> {
  const host = await getHost()
  const json = await getJSON<{ data?: RawTrack[] }>(`${host}/v1/tracks/trending?app_name=${APP}&limit=${limit}`)
  return (json.data ?? [])
    .filter((t) => t && t.id && t.is_streamable !== false)
    .map((t) => normalize(host, t))
}

export async function search(query: string, limit = 30): Promise<AudiusTrack[]> {
  const host = await getHost()
  const json = await getJSON<{ data?: RawTrack[] }>(
    `${host}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${APP}&limit=${limit}`,
  )
  return (json.data ?? [])
    .filter((t) => t && t.id && t.is_streamable !== false)
    .map((t) => normalize(host, t))
}
