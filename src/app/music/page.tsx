'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { cn } from '@/lib/utils'

const PLAYLISTS = [
  {
    id: '37i9dQZF1DWZeKCadgRdKQ',
    name: 'Deep Focus',
    vibe: 'Concentración profunda',
    accent: 'core' as const,
    icon: '⚡',
  },
  {
    id: '37i9dQZF1DX8Uebhn9wzrS',
    name: 'Lo-Fi Beats',
    vibe: 'Flujo relajado',
    accent: 'plasma' as const,
    icon: '🌙',
  },
  {
    id: '37i9dQZF1DX4sWSpwq3LiO',
    name: 'Peaceful Piano',
    vibe: 'Calma total',
    accent: 'solar' as const,
    icon: '☀️',
  },
  {
    id: '37i9dQZF1DX0vHZ8elq0UK',
    name: 'Workday',
    vibe: 'Energía constante',
    accent: 'nova' as const,
    icon: '🔥',
  },
]

const accentStyles = {
  core:   { active: 'border-core/55 bg-core/10 shadow-glow-core',   dot: 'bg-core',   text: 'text-core' },
  plasma: { active: 'border-plasma/55 bg-plasma/10 shadow-glow-plasma', dot: 'bg-[#c4b5fd]', text: 'text-[#c4b5fd]' },
  solar:  { active: 'border-solar/55 bg-solar/10 shadow-glow-solar',  dot: 'bg-solar',  text: 'text-solar' },
  nova:   { active: 'border-nova/55 bg-nova/10 shadow-glow-nova',    dot: 'bg-nova',   text: 'text-nova' },
}

function EqBars({ accent }: { accent: keyof typeof accentStyles }) {
  return (
    <div className="flex items-end gap-[2px]">
      {[3, 5, 4, 6, 3].map((h, i) => (
        <motion.span
          key={i}
          className={cn('w-[3px] rounded-full', accentStyles[accent].dot)}
          animate={{ height: [h, h + 3, h - 1, h + 4, h] }}
          transition={{ duration: 0.9 + i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
          style={{ height: h }}
        />
      ))}
    </div>
  )
}

function Music() {
  const [active, setActive] = useState(PLAYLISTS[0])

  return (
    <div className="flex flex-col gap-5">
      <header className="mt-2">
        <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">
          Frecuencias
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Música para el foco</h1>
        <p className="mt-1 text-sm text-ink-dim">Elige una frecuencia y entra en estado de flujo.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PLAYLISTS.map((p) => {
          const styles = accentStyles[p.accent]
          const isActive = active.id === p.id
          return (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className={cn(
                'glass-panel p-4 text-left transition-all',
                isActive ? styles.active : 'hover:border-glass-border-hi hover:bg-white/[0.04]',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{p.icon}</span>
                {isActive && <EqBars accent={p.accent} />}
              </div>
              <p className={cn('mt-2 font-display text-sm font-semibold', isActive && styles.text)}>
                {p.name}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-ghost">{p.vibe}</p>
            </button>
          )
        })}
      </div>

      <GlassPanel className="overflow-hidden p-2" tilt={false}>
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <iframe
            src={`https://open.spotify.com/embed/playlist/${active.id}?theme=0`}
            width="100%"
            height="420"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
            title={active.name}
          />
        </motion.div>
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
