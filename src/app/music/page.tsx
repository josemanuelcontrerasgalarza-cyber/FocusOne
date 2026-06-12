'use client'

import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { cn } from '@/lib/utils'

const PLAYLISTS = [
  { id: '37i9dQZF1DWZeKCadgRdKQ', name: 'Deep Focus', vibe: 'Concentración profunda' },
  { id: '37i9dQZF1DX8Uebhn9wzrS', name: 'Lo-Fi Beats', vibe: 'Flujo relajado' },
  { id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Piano', vibe: 'Calma total' },
  { id: '37i9dQZF1DX0vHZ8elq0UK', name: 'Workday', vibe: 'Energía constante' },
]

function Music() {
  const [active, setActive] = useState(PLAYLISTS[0])

  return (
    <div className="flex flex-col gap-5">
      <header className="mt-2">
        <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">
          Frecuencias
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Música para el foco</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PLAYLISTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p)}
            className={cn(
              'glass-panel p-4 text-left transition-all',
              active.id === p.id && 'border-core/50 shadow-glow-core',
            )}
          >
            <p className="font-display text-sm font-semibold">{p.name}</p>
            <p className="mt-0.5 text-[11px] text-ink-ghost">{p.vibe}</p>
          </button>
        ))}
      </div>

      <GlassPanel className="overflow-hidden p-2" tilt={false}>
        <iframe
          key={active.id}
          src={`https://open.spotify.com/embed/playlist/${active.id}?theme=0`}
          width="100%"
          height="420"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
          title={active.name}
        />
      </GlassPanel>
    </div>
  )
}

export default function MusicPage() {
  return (
    <AppShell>
      <Music />
    </AppShell>
  )
}
