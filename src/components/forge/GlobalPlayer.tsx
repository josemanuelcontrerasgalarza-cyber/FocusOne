'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Play, Pause, SkipBack, SkipForward, Music2, X, ChevronUp } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'

function fmt(s: number): string {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/**
 * Reproductor GLOBAL: vive en el layout de La Fragua, así que el <audio> NO se
 * desmonta al navegar entre pantallas — la música sigue sonando hasta que el
 * usuario la pare. Muestra un widget flotante con el logo de música y los
 * controles. Las páginas (p. ej. /musica) solo cargan la cola en el store.
 */
export function GlobalPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const { queue, idx, playing, time, dur, label, toggle, next, prev, setPlaying, setTime, setDur } =
    usePlayerStore()
  const [expanded, setExpanded] = useState(false)
  const [hidden, setHidden] = useState(false)

  const current = idx >= 0 && idx < queue.length ? queue[idx] : null
  const streamUrl = current?.streamUrl ?? ''

  // Carga la pista actual cuando cambia.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !streamUrl) return
    a.src = streamUrl
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl])

  // Play / pausa reactivo al estado del store.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !streamUrl) return
    if (playing) a.play().catch(() => {})
    else a.pause()
  }, [playing, streamUrl])

  // Si hay pista, el widget se muestra otra vez.
  useEffect(() => {
    if (current) setHidden(false)
  }, [current])

  const showWidget = current && !hidden

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onEnded={() => next()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Botón flotante "logo de música" cuando no hay nada sonando. */}
      {!current && (
        <Link
          href="/musica"
          aria-label="Escuchar música"
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-forge-line bg-forge-surface text-forge-ink-dim shadow-ember transition-colors hover:border-ember/50 hover:text-ember sm:bottom-6"
        >
          <Music2 size={20} />
        </Link>
      )}

      {/* Widget del reproductor (persistente). */}
      {showWidget && (
        <div className="fixed bottom-20 right-4 z-40 w-[min(92vw,360px)] overflow-hidden rounded-forge border border-forge-line bg-forge-canvas/95 shadow-ember backdrop-blur-md sm:bottom-6">
          <div className="flex items-center gap-3 p-2.5">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {current.artwork ? (
                <img src={current.artwork} alt="" className="h-11 w-11 rounded-md object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-forge-raised">
                  <Music2 size={16} className="text-ember" />
                </div>
              )}
              {playing && (
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center">
                  <span className="h-2 w-2 animate-ping rounded-full bg-ember" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-forge text-[13px] font-semibold text-forge-ink">
                {current.title}
              </p>
              <p className="truncate text-[11px] text-forge-ink-faint">{current.artist}</p>
            </div>

            <button onClick={() => prev()} className="p-1.5 text-forge-ink-dim hover:text-forge-ink">
              <SkipBack size={16} />
            </button>
            <button
              onClick={() => toggle()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ember text-forge-canvas shadow-ember"
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={() => next()} className="p-1.5 text-forge-ink-dim hover:text-forge-ink">
              <SkipForward size={16} />
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1 text-forge-ink-faint hover:text-forge-ink"
              aria-label="Más"
            >
              <ChevronUp size={16} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          </div>

          {/* Barra de progreso + parar (expandido). */}
          {expanded && (
            <div className="flex items-center gap-2 border-t border-forge-line px-3 py-2">
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
              <button
                onClick={() => {
                  const a = audioRef.current
                  if (a) a.pause()
                  setPlaying(false)
                  setHidden(true)
                }}
                aria-label="Cerrar reproductor"
                className="ml-1 text-forge-ink-faint hover:text-red-400"
              >
                <X size={15} />
              </button>
              {label && (
                <span className="hidden font-num text-[10px] uppercase tracking-wider text-forge-ink-faint sm:inline">
                  {label}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
