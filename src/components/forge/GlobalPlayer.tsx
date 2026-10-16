'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { Play, Pause, SkipBack, SkipForward, Music2, X, ChevronUp } from 'lucide-react'
import { IconButton } from '@/components/ui/Button'
import { usePlayerStore } from '@/store/playerStore'

function fmt(s: number): string {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// En móvil se coloca por encima de la barra de navegación inferior (y de la
// zona segura); en escritorio, en la esquina.
const POSITION = 'fixed right-3 z-40 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] sm:right-4 lg:bottom-6 lg:right-6'

/**
 * Reproductor GLOBAL: vive en el layout del espacio de trabajo, así que el
 * <audio> NO se desmonta al navegar — la música sigue sonando hasta que el
 * usuario la pare. Las páginas (p. ej. /musica) solo cargan la cola en el store.
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
  const pct = dur ? Math.min(100, (time / dur) * 100) : 0

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

      {/* Acceso discreto a Música cuando no hay nada sonando. */}
      {!current && (
        <Link
          href="/musica"
          aria-label="Escuchar música"
          title="Música"
          className={clsx(
            POSITION,
            'flex h-10 w-10 items-center justify-center rounded-full border border-line bg-raised text-ink-dim shadow-card transition-colors hover:border-line-strong hover:text-ink',
          )}
        >
          <Music2 size={17} />
        </Link>
      )}

      {/* Mini reproductor (persistente). */}
      {showWidget && (
        <section
          aria-label="Reproductor de música"
          className={clsx(
            POSITION,
            'w-[min(calc(100vw-1.5rem),340px)] animate-scale-in overflow-hidden rounded-card border border-line bg-raised shadow-pop',
          )}
        >
          {/* Progreso fino siempre visible */}
          <div className="h-0.5 w-full bg-sunken" aria-hidden>
            <div className="h-full bg-accent-fg transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
          </div>

          <div className="flex items-center gap-2.5 p-2.5">
            <div className="relative shrink-0">
              {current.artwork ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.artwork} alt="" className="h-10 w-10 rounded-control object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-control bg-sunken">
                  <Music2 size={16} className="text-ink-dim" />
                </div>
              )}
              {playing && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-raised bg-accent-fg" aria-hidden />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{current.title}</p>
              <p className="truncate text-[11.5px] text-ink-faint">{current.artist}</p>
            </div>

            <IconButton label="Anterior" size="sm" onClick={() => prev()}>
              <SkipBack size={15} />
            </IconButton>
            <button
              type="button"
              onClick={() => toggle()}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-[filter] hover:brightness-[1.04]"
            >
              {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="translate-x-px" />}
            </button>
            <IconButton label="Siguiente" size="sm" onClick={() => next()}>
              <SkipForward size={15} />
            </IconButton>
            <IconButton
              label={expanded ? 'Menos opciones' : 'Más opciones'}
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              <ChevronUp size={15} className={clsx('transition-transform duration-200', expanded && 'rotate-180')} />
            </IconButton>
          </div>

          {/* Posición + cerrar (expandido). */}
          {expanded && (
            <div className="animate-fade-in border-t border-line px-3 pb-2.5 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-8 font-mono text-[10.5px] text-ink-faint">{fmt(time)}</span>
                <input
                  type="range"
                  min={0}
                  max={dur || 0}
                  value={time}
                  aria-label="Posición de la pista"
                  onChange={(e) => {
                    const a = audioRef.current
                    if (a) {
                      a.currentTime = Number(e.target.value)
                      setTime(Number(e.target.value))
                    }
                  }}
                  className="h-1 min-w-0 flex-1 cursor-pointer"
                  style={{ accentColor: 'rgb(var(--accent-fg))' }}
                />
                <span className="w-8 text-right font-mono text-[10.5px] text-ink-faint">{fmt(dur)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-ink-faint">{label ? `Cola: ${label}` : 'Música vía Audius'}</span>
                <button
                  type="button"
                  onClick={() => {
                    const a = audioRef.current
                    if (a) a.pause()
                    setPlaying(false)
                    setHidden(true)
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-control px-1.5 py-1 text-[12px] text-ink-dim transition-colors hover:bg-sunken hover:text-danger"
                >
                  <X size={13} /> Cerrar
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}
