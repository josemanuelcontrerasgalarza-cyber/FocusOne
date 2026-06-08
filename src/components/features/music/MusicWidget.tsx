import { useState, useRef } from 'react'
import { Music, X, Minus, Maximize2, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface MusicWidgetProps {
  onClose: () => void
}

const quickPlaylists = [
  { id: '7nku1YIwM6qDprKTqT6Zxg', name: 'FocusOne Deep Work', emoji: '🎯' },
  { id: '5zmq1ve3MGhrZvZ1en2kU4', name: 'FocusOne Coding Mode', emoji: '⚡' },
  { id: '7fMT4MC1Jm8QiQ6bkdKqhN', name: 'FocusOne Chill & Flow', emoji: '🌿' },
  { id: '37i9dQZF1DX5trt9i14X7j', name: 'Coding Mode', emoji: '💻' },
  { id: '0EAo4yaK5HfxrsQXAqaOLz', name: 'LoFi Deep Focus', emoji: '🎵' },
  { id: '0F1xjpUYQ1KeXnbwgbL7bf', name: 'Ondas Gamma', emoji: '🧠' },
]

function extractSpotifyId(input: string): { id: string; type: string } | null {
  // Playlist URL: https://open.spotify.com/playlist/xxxxx
  // Track URL: https://open.spotify.com/track/xxxxx
  // Album URL: https://open.spotify.com/album/xxxxx
  // URI: spotify:playlist:xxxxx
  const urlMatch = input.match(/open\.spotify\.com\/(playlist|track|album|artist)\/([a-zA-Z0-9]+)/)
  if (urlMatch) return { type: urlMatch[1], id: urlMatch[2] }

  const uriMatch = input.match(/spotify:(playlist|track|album|artist):([a-zA-Z0-9]+)/)
  if (uriMatch) return { type: uriMatch[1], id: uriMatch[2] }

  return null
}

export function MusicWidget({ onClose }: MusicWidgetProps) {
  const [minimized, setMinimized] = useState(false)
  const [activeId, setActiveId] = useState('7nku1YIwM6qDprKTqT6Zxg')
  const [activeType, setActiveType] = useState('playlist')
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [tab, setTab] = useState<'quick' | 'url'>('quick')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUrlLoad = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return

    const result = extractSpotifyId(trimmed)
    if (result) {
      setActiveId(result.id)
      setActiveType(result.type)
      setUrlError('')
      setUrlInput('')
      setTab('quick')
    } else {
      setUrlError('URL o URI de Spotify inválida')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUrlLoad()
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40',
        'bg-bg-surface border border-border rounded-2xl shadow-2xl',
        'transition-all duration-200',
        minimized ? 'w-64' : 'w-80',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Music size={15} className="text-primary-light" />
          <span className="text-sm font-semibold text-text-primary">Música</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(v => !v)}
            className="p-1.5 rounded-lg text-text-hint hover:text-text-muted hover:bg-bg-elevated transition-colors"
          >
            {minimized ? <Maximize2 size={13} /> : <Minus size={13} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-hint hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 p-2 border-b border-border">
            <button
              onClick={() => setTab('quick')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                tab === 'quick'
                  ? 'bg-primary/15 text-primary-light'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              ⚡ Rápido
            </button>
            <button
              onClick={() => { setTab('url'); setTimeout(() => inputRef.current?.focus(), 100) }}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                tab === 'url'
                  ? 'bg-primary/15 text-primary-light'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              🔗 Pegar URL
            </button>
          </div>

          {tab === 'quick' ? (
            /* Quick playlists */
            <div className="p-2 flex flex-col gap-1 max-h-40 overflow-y-auto">
              {quickPlaylists.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setActiveId(p.id); setActiveType('playlist') }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-sm',
                    activeId === p.id
                      ? 'bg-primary/15 text-primary-light'
                      : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary',
                  )}
                >
                  <span>{p.emoji}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {activeId === p.id && <div className="w-1.5 h-1.5 rounded-full bg-primary-light animate-pulse shrink-0" />}
                </button>
              ))}
            </div>
          ) : (
            /* URL input */
            <div className="p-3 flex flex-col gap-2">
              <p className="text-xs text-text-muted">
                Pega cualquier URL o URI de Spotify:
              </p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setUrlError('') }}
                  onKeyDown={handleKeyDown}
                  placeholder="https://open.spotify.com/..."
                  className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  onClick={handleUrlLoad}
                  disabled={!urlInput.trim()}
                  className="px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs disabled:opacity-50 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              {urlError && <p className="text-xs text-danger">{urlError}</p>}
              <p className="text-xs text-text-hint">
                Funciona con playlists, álbumes, tracks y artistas
              </p>
            </div>
          )}

          {/* Spotify embed */}
          <div className="p-2 pt-0">
            <iframe
              key={`${activeType}-${activeId}`}
              src={`https://open.spotify.com/embed/${activeType}/${activeId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl"
            />
          </div>
        </>
      )}

      {/* Minimized — solo muestra el embed compacto */}
      {minimized && (
        <div className="p-2">
          <iframe
            key={`min-${activeType}-${activeId}`}
            src={`https://open.spotify.com/embed/${activeType}/${activeId}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
          />
        </div>
      )}
    </div>
  )
}
