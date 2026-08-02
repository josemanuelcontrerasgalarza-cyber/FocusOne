'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Rocket, Star, Newspaper, ChevronLeft, ChevronRight,
  Target, Timer, Trophy, Flame, type LucideIcon,
} from 'lucide-react'
import { ForgeDemoButton } from '@/components/forge/ForgeDemoButton'
import { ReviewsPanel } from './ReviewsPanel'
import { ChangelogPanel } from './ChangelogPanel'
import { APP_VERSION } from '@/lib/changelog'
import { cn } from '@/lib/utils'

interface Slide {
  key: string
  label: string
  icon: LucideIcon
  render: () => React.ReactNode
}

const HIGHLIGHTS = [
  { icon: Target, text: 'Una misión a la vez' },
  { icon: Timer, text: 'Timer con barra de calor' },
  { icon: Flame, text: 'Quiz de cierre que la sella' },
  { icon: Trophy, text: 'Racha, puntos y recompensas' },
]

const PILLARS = [
  { title: 'Enfoque radical', body: 'Menos ruido, una prioridad. Terminar lo que importa.' },
  { title: 'El ritual de la fragua', body: 'Enciendes una misión, la forjas con foco y la sellas con un cierre.' },
  { title: 'Constancia visible', body: 'Racha, puntos y recompensas que te traen de vuelta cada día.' },
]

const SLIDES: Slide[] = [
  {
    key: 'what',
    label: 'Qué es',
    icon: Rocket,
    render: () => (
      <div>
        <h3 className="font-forge text-xl font-bold text-forge-ink">
          ¿Qué es <span className="text-ember">FocusOne</span>?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-forge-ink-dim">
          Tu fragua de enfoque. En vez de listas infinitas que paralizan, eliges UNA misión
          y la forjas: un timer que sube de calor, un cierre que la sella y una racha que te
          mantiene volviendo.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HIGHLIGHTS.map((h) => {
            const Icon = h.icon
            return (
              <div key={h.text} className="flex items-center gap-2.5 rounded-forge border border-forge-line bg-forge-surface px-3 py-2.5">
                <Icon size={16} className="shrink-0 text-ember" />
                <span className="text-sm text-forge-ink-dim">{h.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    ),
  },
  {
    key: 'kratos',
    label: 'Kratos Labs',
    icon: Sparkles,
    render: () => (
      <div>
        <h3 className="font-forge text-xl font-bold text-forge-ink">
          ¿Quién es <span className="text-ember">Kratos Labs</span>?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-forge-ink-dim">
          Kratos Labs es el estudio independiente detrás de FocusOne. Diseñamos herramientas para
          mentes que necesitan claridad: software rápido, hermoso y con enfoque radical. Creemos
          que la productividad no es hacer más, sino terminar lo que importa.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-forge border border-forge-line bg-forge-surface px-3 py-2.5">
              <p className="text-sm font-medium text-ember">{p.title}</p>
              <p className="mt-0.5 text-sm text-forge-ink-dim">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: 'reviews',
    label: 'Opiniones',
    icon: Star,
    render: () => (
      <div>
        <h3 className="font-forge text-xl font-bold text-forge-ink">Opiniones de la comunidad</h3>
        <p className="mt-1 mb-3 text-sm text-forge-ink-dim">Anónimas y abiertas. Deja la tuya.</p>
        <ReviewsPanel />
      </div>
    ),
  },
  {
    key: 'news',
    label: 'Novedades',
    icon: Newspaper,
    render: () => (
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-forge text-xl font-bold text-forge-ink">Novedades</h3>
          <span className="inline-flex items-center rounded-full border border-ember/40 bg-ember/10 px-2 py-0.5 font-num text-[10px] uppercase tracking-wide text-ember">
            v{APP_VERSION}
          </span>
        </div>
        <p className="mt-1 mb-3 text-sm text-forge-ink-dim">Todo lo que hemos construido, versión a versión.</p>
        <ChangelogPanel />
      </div>
    ),
  },
]

export function IntroStories() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const Icon = slide.icon

  const go = (i: number) => setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)))

  return (
    <div className="forge-panel mx-auto w-full max-w-2xl p-5">
      {/* Barritas segmentadas */}
      <div className="flex gap-1.5">
        {SLIDES.map((s, i) => (
          <button key={s.key} onClick={() => go(i)} className="group flex-1" aria-label={s.label}>
            <span
              className={cn(
                'block h-1 rounded-full transition-all',
                i <= index ? 'bg-ember' : 'bg-white/10 group-hover:bg-white/20',
              )}
            />
          </button>
        ))}
      </div>

      {/* Cabecera del paso */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-ember">
          <Icon size={15} />
          <span className="font-num text-[11px] uppercase tracking-[0.2em]">{slide.label}</span>
        </div>
        <span className="font-num text-[11px] text-forge-ink-faint">
          {index + 1} / {SLIDES.length}
        </span>
      </div>

      {/* Contenido */}
      <div className="mt-3 min-h-[340px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.key}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            {slide.render()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navegación + CTA */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-forge-line pt-4">
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-forge-ink-dim transition-colors hover:text-forge-ink disabled:opacity-30"
        >
          <ChevronLeft size={16} /> Atrás
        </button>

        {index < SLIDES.length - 1 ? (
          <button
            onClick={() => go(index + 1)}
            className="flex items-center gap-1 rounded-full border border-forge-line px-4 py-2 text-sm text-forge-ink transition-colors hover:border-forge-ink-faint"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        ) : (
          <Link
            href="/register"
            className="rounded-full bg-ember px-4 py-2 font-forge text-sm font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px"
          >
            Crear cuenta
          </Link>
        )}
      </div>

      {/* CTA demo persistente */}
      <div className="mt-3 flex justify-center">
        <ForgeDemoButton className="w-full sm:w-auto" />
      </div>
    </div>
  )
}
