'use client'

import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import { Play, Pause, Search, Music2, RefreshCw } from 'lucide-react'
import { usePlayerStore, type PlayerTrack } from '@/store/playerStore'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, EmptyState, PageHeader, Skeleton } from '@/components/ui/primitives'

function fmt(s: number): string {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function MusicClient() {
  const [tracks, setTracks] = useState<PlayerTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [heading, setHeading] = useState('Tendencias')

  const { setQueue, toggle, queue, idx, playing } = usePlayerStore()
  const currentId = idx >= 0 && idx < queue.length ? queue[idx].id : null

  const load = useCallback(async (mode: 'trending' | 'search', q?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url =
        mode === 'search' && q
          ? `/api/music/tracks?mode=search&q=${encodeURIComponent(q)}`
          : '/api/music/tracks?mode=trending'
      const res = await fetch(url)
      const json = (await res.json()) as { tracks?: PlayerTrack[]; error?: string }
      if (!res.ok || !json.tracks?.length) {
        setTracks([])
        setError(json.error ?? 'Sin resultados.')
        return
      }
      setTracks(json.tracks)
    } catch {
      setTracks([])
      setError('No se pudo cargar la música. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load('trending')
  }, [load])

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) {
      setHeading(`Resultados para “${q}”`)
      void load('search', q)
    } else {
      setHeading('Tendencias')
      void load('trending')
    }
  }

  function playTrack(i: number) {
    // Si es la que ya suena, pausa/reanuda; si no, carga toda la lista como cola.
    if (tracks[i].id === currentId) toggle()
    else setQueue(tracks, i, heading)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        eyebrow="Tu espacio"
        title="Música"
        description="Sonido para concentrarte, gratis y sin anuncios. Sigue sonando aunque cambies de pantalla."
      />

      <form onSubmit={onSearch} className="mt-8 flex items-center gap-2" role="search">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artistas, canciones o géneros: lo-fi, piano, ambient…"
            aria-label="Buscar música"
            className="k-input h-10 pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" className="h-10">
          Buscar
        </Button>
      </form>

      <Card as="section" className="mt-4">
        <CardHeader eyebrow={heading === 'Tendencias' ? 'Ahora' : 'Búsqueda'} title={heading} />
        {loading ? (
          <div className="space-y-1 p-2" aria-busy="true" aria-label="Cargando música">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="h-10 w-10" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            compact
            icon={<Music2 size={18} />}
            title="No hay nada que mostrar"
            description={error}
            action={
              <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={() => load('trending')}>
                Ver tendencias
              </Button>
            }
          />
        ) : (
          <ul className="p-1.5 sm:p-2">
            {tracks.map((t, i) => {
              const active = t.id === currentId
              const isPlaying = active && playing
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => playTrack(i)}
                    aria-label={`${isPlaying ? 'Pausar' : 'Reproducir'} ${t.title} de ${t.artist}`}
                    aria-current={active ? 'true' : undefined}
                    className={clsx(
                      'group flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors',
                      active ? 'bg-sunken' : 'hover:bg-sunken',
                    )}
                  >
                    <span className="relative h-10 w-10 shrink-0">
                      {t.artwork ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.artwork} alt="" className="h-10 w-10 rounded-control object-cover" loading="lazy" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-control bg-sunken">
                          <Music2 size={16} className="text-ink-faint" />
                        </span>
                      )}
                      <span
                        className={clsx(
                          'absolute inset-0 flex items-center justify-center rounded-control bg-ink/45 text-canvas transition-opacity',
                          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                        )}
                        aria-hidden
                      >
                        {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={clsx('block truncate text-sm font-medium', active ? 'text-accent-fg' : 'text-ink')}>
                        {t.title}
                      </span>
                      <span className="block truncate text-xs text-ink-faint">{t.artist}</span>
                    </span>
                    {isPlaying && (
                      <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                        <span className="w-[3px] animate-pulse rounded-sm bg-accent-fg" style={{ height: '60%' }} />
                        <span className="w-[3px] animate-pulse rounded-sm bg-accent-fg [animation-delay:150ms]" style={{ height: '100%' }} />
                        <span className="w-[3px] animate-pulse rounded-sm bg-accent-fg [animation-delay:300ms]" style={{ height: '40%' }} />
                      </span>
                    )}
                    <span className="w-10 text-right font-mono text-[12px] text-ink-faint">{fmt(t.duration)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <p className="mt-4 text-center text-xs text-ink-faint">Música vía Audius, libre y sin anuncios.</p>
    </div>
  )
}
