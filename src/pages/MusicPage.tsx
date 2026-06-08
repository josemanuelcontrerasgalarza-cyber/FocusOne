import { useState } from 'react'
import { Music, ExternalLink, Play } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'

const playlists = [
  {
    id: '0vvXsWCC9xrXsKd4eujFmD',
    name: 'Lo-Fi Hip Hop',
    description: 'Beats relajados para estudiar y trabajar',
    emoji: '🎵',
    color: 'from-purple-500/20 to-blue-500/20',
  },
  {
    id: '37i9dQZF1DWZeKCadgRdKQ',
    name: 'Deep Focus',
    description: 'Música para concentración profunda',
    emoji: '🧠',
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    id: '37i9dQZF1DX8NTLI2TtZa6',
    name: 'Coding Mode',
    description: 'El soundtrack perfecto para programar',
    emoji: '💻',
    color: 'from-green-500/20 to-emerald-500/20',
  },
  {
    id: '37i9dQZF1DX4sWSpwq3LiO',
    name: 'Peaceful Piano',
    description: 'Piano suave para trabajar en calma',
    emoji: '🎹',
    color: 'from-yellow-500/20 to-orange-500/20',
  },
  {
    id: '37i9dQZF1DWXe9gFZP0gtP',
    name: 'Ambient Chill',
    description: 'Sonidos ambientales y naturaleza',
    emoji: '🌿',
    color: 'from-teal-500/20 to-green-500/20',
  },
  {
    id: '37i9dQZF1DX4GJ8roCpFpZ',
    name: 'Focus Flow',
    description: 'Electrónica instrumental para el flujo',
    emoji: '⚡',
    color: 'from-pink-500/20 to-purple-500/20',
  },
]

export function MusicPage() {
  const [activePlaylist, setActivePlaylist] = useState(playlists[0].id)
  const [spotifyMode, setSpotifyMode] = useState<'embed' | 'app'>('embed')

  const active = playlists.find(p => p.id === activePlaylist) ?? playlists[0]

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Music size={22} className="text-primary-light" />
            Música para trabajar
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Elige tu playlist y entra en modo enfoque</p>
        </div>

        {/* Toggle modo */}
        <div className="flex gap-1 bg-bg-elevated rounded-lg p-1">
          <button
            onClick={() => setSpotifyMode('embed')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm transition-colors duration-150',
              spotifyMode === 'embed'
                ? 'bg-bg-surface text-text-primary font-medium'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            🎵 Reproductor
          </button>
          <button
            onClick={() => setSpotifyMode('app')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm transition-colors duration-150',
              spotifyMode === 'app'
                ? 'bg-bg-surface text-text-primary font-medium'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            📱 Abrir en Spotify
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de playlists */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-hint uppercase tracking-wide mb-1">Playlists</p>
          {playlists.map(playlist => (
            <button
              key={playlist.id}
              onClick={() => setActivePlaylist(playlist.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150',
                activePlaylist === playlist.id
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-bg-surface hover:border-border hover:bg-bg-elevated',
              )}
            >
              <span className="text-xl shrink-0">{playlist.emoji}</span>
              <div className="min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  activePlaylist === playlist.id ? 'text-primary-light' : 'text-text-primary',
                )}>
                  {playlist.name}
                </p>
                <p className="text-xs text-text-muted truncate">{playlist.description}</p>
              </div>
              {activePlaylist === playlist.id && (
                <Play size={14} className="text-primary-light shrink-0 ml-auto" />
              )}
            </button>
          ))}
        </div>

        {/* Player */}
        <div className="lg:col-span-2">
          {spotifyMode === 'embed' ? (
            <div className="flex flex-col gap-3">
              <Card padding="md" className={cn('bg-gradient-to-br border-border', active.color)}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{active.emoji}</span>
                  <div>
                    <h2 className="font-bold text-text-primary">{active.name}</h2>
                    <p className="text-sm text-text-muted">{active.description}</p>
                  </div>
                </div>
              </Card>

              <iframe
                key={activePlaylist}
                src={`https://open.spotify.com/embed/playlist/${activePlaylist}?utm_source=generator&theme=0`}
                width="100%"
                height="380"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-xl"
              />

              <p className="text-xs text-text-hint text-center">
                La reproducción completa requiere cuenta de Spotify Premium
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Card padding="md" className={cn('bg-gradient-to-br border-border', active.color)}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{active.emoji}</span>
                  <div>
                    <h2 className="font-bold text-text-primary">{active.name}</h2>
                    <p className="text-sm text-text-muted">{active.description}</p>
                  </div>
                </div>
                <Button
                  fullWidth
                  leftIcon={<ExternalLink size={16} />}
                  onClick={() => window.open(`https://open.spotify.com/playlist/${activePlaylist}`, '_blank')}
                  className="bg-[#1DB954] hover:bg-[#1aa34a] border-transparent text-white"
                >
                  Abrir en Spotify
                </Button>
              </Card>

              <div className="grid grid-cols-1 gap-2 mt-2">
                <p className="text-xs font-semibold text-text-hint uppercase tracking-wide">Abrir todas en Spotify</p>
                {playlists.map(p => (
                  <button
                    key={p.id}
                    onClick={() => window.open(`https://open.spotify.com/playlist/${p.id}`, '_blank')}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-surface hover:bg-bg-elevated hover:border-border transition-colors text-left"
                  >
                    <span className="text-lg">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{p.name}</p>
                      <p className="text-xs text-text-muted truncate">{p.description}</p>
                    </div>
                    <ExternalLink size={13} className="text-text-hint shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
