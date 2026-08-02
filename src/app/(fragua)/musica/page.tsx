'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

// Playlists públicas de Spotify (embed, sin login). Frecuencias de foco.
const PLAYLISTS = [
  { id: '37i9dQZF1DWZeKCadgRdKQ', name: 'Deep Focus', vibe: 'Concentración profunda', icon: '⚡' },
  { id: '37i9dQZF1DX8Uebhn9wzrS', name: 'Lo-Fi Beats', vibe: 'Flujo relajado', icon: '🌙' },
  { id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Piano', vibe: 'Calma total', icon: '☀️' },
  { id: '37i9dQZF1DX0vHZ8elq0UK', name: 'Workday', vibe: 'Energía constante', icon: '🔥' },
]

export default function MusicaPage() {
  const [active, setActive] = useState(PLAYLISTS[0])

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">
          Frecuencias
        </p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">
          Música
        </h1>
        <p className="mt-1 text-sm text-forge-ink-dim">
          Elige una frecuencia y entra en estado de flujo.
        </p>
      </header>

      {/* Selector de playlists */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PLAYLISTS.map((p) => {
          const isActive = active.id === p.id
          return (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className={`rounded-forge border p-4 text-left transition-colors ${
                isActive
                  ? 'border-ember/50 bg-ember/[0.06] shadow-ember'
                  : 'border-forge-line bg-forge-surface hover:border-forge-ink-faint'
              }`}
            >
              <span className="text-xl">{p.icon}</span>
              <p
                className={`mt-2 font-forge text-sm font-semibold ${
                  isActive ? 'text-ember' : 'text-forge-ink'
                }`}
              >
                {p.name}
              </p>
              <p className="mt-0.5 text-[11px] text-forge-ink-faint">{p.vibe}</p>
            </button>
          )
        })}
      </div>

      {/* Reproductor embebido */}
      <div className="overflow-hidden rounded-forge border border-forge-line bg-forge-surface p-2">
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
            style={{ border: 0 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
            title={active.name}
          />
        </motion.div>
      </div>
    </section>
  )
}
