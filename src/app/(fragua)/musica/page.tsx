'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Search, Loader2, Music2, TrendingUp } from 'lucide-react'

interface Track {
  id: string
  title: string
  artist: string
  artwork: string | null
  duration: number
  streamUrl: string
}

function fmt(s: number): string {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function MusicaPage() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [idx, setIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [heading, setHeading] = useState('Tendencias')
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)

  const current = idx >= 0 ? tracks[idx] : null

  const load = useCallback(async (mode: 'trending' | 'search', q?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url =
        mode === 'search' && q
          ? `/api/music/tracks?mode=search&q=${encodeURIComponent(q)}`
          : '/api/music/tracks?mode=trending'
      const res = await fetch(url)
      const json = (await res.json()) as { tracks?: Track[]; error?: string }
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

  // Al cambiar de pista, carga y reproduce.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !current) return
    a.src = current.streamUrl
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  function toggle() {
    const a = audioRef.current
    if (!a || !current) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  function go(delta: number) {
    if (!tracks.length) return
    setIdx((i) => {
      const base = i < 0 ? 0 : i
      return (base + delta + tracks.length) % tracks.length
    })
  }

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

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 pb-28 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">Frecuencias</p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">Música</h1>
        <p className="mt-1 text-sm text-forge-ink-dim">
          Ilimitada, gratis y sin anuncios. Entra en estado de flujo.
        </p>
      </header>

      {/* Búsqueda */}
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
        <button
          type="submit"
          className="rounded-forge bg-ember px-4 py-2.5 font-forge text-sm font-bold text-forge-canvas shadow-ember"
        >
          Buscar
        </button>
      </form>

      <div className="flex items-center gap-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
        {heading === 'Tendencias' ? <TrendingUp size={13} /> : <Music2 size={13} />} {heading}
      </div>

      {/* Lista */}
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
            const active = i === idx
            return (
              <button
                key={t.id}
                onClick={() => setIdx(i)}
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
                {active && playing ? (
                  <Pause size={16} className="text-ember" />
                ) : (
                  <Play size={16} className={active ? 'text-ember' : 'text-forge-ink-faint'} />
                )}
              </button>
            )
          })}
        </div>
      )}

      <p className="text-center font-num text-[10px] uppercase tracking-[0.16em] text-forge-ink-faint">
        Música vía Audius · libre y sin anuncios
      </p>

      {/* Reproductor fijo */}
      {current && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-forge-line bg-forge-canvas/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {current.artwork ? (
              <img src={current.artwork} alt="" className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-forge-raised">
                <Music2 size={18} className="text-forge-ink-faint" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-forge text-sm font-semibold text-forge-ink">{current.title}</p>
              <p className="truncate text-[12px] text-forge-ink-faint">{current.artist}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-num text-[10px] text-forge-ink-faint">{fmt(time)}</span>
                <input
                  type="range"
                  min={0}
                  max={dur || 0}
                  value={time}
                  onChange={(e) => {
                    const a = audioRef.current
                    if (a) {
                      a.currentTime = Number(e.target.value)
                      setTime(Number(e.target.value))
                    }
                  }}
                  className="h-1 flex-1 accent-ember"
                />
                <span className="font-num text-[10px] text-forge-ink-faint">{fmt(dur)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => go(-1)} className="p-2 text-forge-ink-dim hover:text-forge-ink">
                <SkipBack size={18} />
              </button>
              <button
                onClick={toggle}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-ember text-forge-canvas shadow-ember"
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button onClick={() => go(1)} className="p-2 text-forge-ink-dim hover:text-forge-ink">
                <SkipForward size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onEnded={() => go(1)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </section>
  )
}
