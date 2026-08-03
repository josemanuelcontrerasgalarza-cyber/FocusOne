'use client'

import { useCallback, useEffect, useState } from 'react'
import { Play, Pause, Search, Loader2, Music2, TrendingUp } from 'lucide-react'
import { usePlayerStore, type PlayerTrack } from '@/store/playerStore'

function fmt(s: number): string {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function MusicaPage() {
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
      setError('No se pudo cargar la música.')
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
      setHeading(`Resultados: “${q}”`)
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
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 pb-28 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">Frecuencias</p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">Música</h1>
        <p className="mt-1 text-sm text-forge-ink-dim">
          Ilimitada, gratis y sin anuncios. Sigue sonando aunque cambies de pantalla.
        </p>
      </header>

      <form onSubmit={onSearch} className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-forge border border-forge-line bg-forge-surface px-3">
          <Search size={16} className="text-forge-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca artistas, canciones, géneros…"
            className="w-full bg-transparent py-2.5 text-sm text-forge-ink outline-none placeholder:text-forge-ink-faint"
          />
        </div>
        <button type="submit" className="rounded-forge bg-ember px-4 py-2.5 font-forge text-sm font-bold text-forge-canvas shadow-ember">
          Buscar
        </button>
      </form>

      <div className="flex items-center gap-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
        {heading === 'Tendencias' ? <TrendingUp size={13} /> : <Music2 size={13} />} {heading}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-forge-ink-faint">
          <Loader2 size={16} className="animate-spin" /> Cargando…
        </div>
      ) : error ? (
        <div className="rounded-forge border border-forge-line bg-forge-surface p-6 text-center text-sm text-forge-ink-dim">
          {error}
          <button onClick={() => load('trending')} className="mt-2 block w-full text-ember hover:underline">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tracks.map((t, i) => {
            const active = t.id === currentId
            return (
              <button
                key={t.id}
                onClick={() => playTrack(i)}
                className={`flex items-center gap-3 rounded-forge border p-2.5 text-left transition-colors ${
                  active ? 'border-ember/50 bg-ember/[0.06]' : 'border-forge-line bg-forge-surface hover:border-forge-ink-faint'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.artwork ? (
                  <img src={t.artwork} alt="" className="h-11 w-11 rounded-md object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-forge-raised">
                    <Music2 size={16} className="text-forge-ink-faint" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-forge text-sm font-semibold ${active ? 'text-ember' : 'text-forge-ink'}`}>
                    {t.title}
                  </p>
                  <p className="truncate text-[12px] text-forge-ink-faint">{t.artist}</p>
                </div>
                <span className="font-num text-[12px] text-forge-ink-faint">{fmt(t.duration)}</span>
                {active && playing ? <Pause size={16} className="text-ember" /> : <Play size={16} className={active ? 'text-ember' : 'text-forge-ink-faint'} />}
              </button>
            )
          })}
        </div>
      )}

      <p className="text-center font-num text-[10px] uppercase tracking-[0.16em] text-forge-ink-faint">
        Música vía Audius · libre y sin anuncios
      </p>
    </section>
  )
}
