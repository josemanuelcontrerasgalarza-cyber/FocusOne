'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Rocket, Star, Newspaper, ChevronLeft, ChevronRight,
  Target, Zap, BarChart2, BrainCircuit, type LucideIcon,
} from 'lucide-react'
import { GlassPanel } from '@/glass/GlassPanel'
import { DemoButton } from '@/components/DemoButton'
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
  { icon: Zap, text: 'Deep Work a pantalla completa' },
  { icon: BarChart2, text: 'Telemetría real de tu constancia' },
  { icon: BrainCircuit, text: 'Copiloto KRATOS IA' },
]

const PILLARS = [
  { title: 'Enfoque radical', body: 'Menos ruido, una prioridad. Terminar lo que importa.' },
  { title: 'Diseño inmersivo', body: 'Cristal líquido y un cosmos 3D que reacciona a tu trabajo.' },
  { title: 'IA al servicio del foco', body: 'Un copiloto que te ayuda a planificar y avanzar.' },
]

const SLIDES: Slide[] = [
  {
    key: 'what',
    label: 'Qué es',
    icon: Rocket,
    render: () => (
      <div>
        <h3 className="font-display text-xl font-semibold">
          ¿Qué es <span className="text-gradient">FocusOne</span>?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">
          El sistema operativo de tu enfoque. En vez de listas infinitas que paralizan, eliges
          UNA misión principal y la terminas. Deep Work a pantalla completa, telemetría real de
          tu constancia y, ahora, un copiloto de IA.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HIGHLIGHTS.map((h) => {
            const Icon = h.icon
            return (
              <div key={h.text} className="flex items-center gap-2.5 rounded-xl border border-glass-border bg-black/20 px-3 py-2.5">
                <Icon size={16} className="shrink-0 text-core" />
                <span className="text-sm text-ink-dim">{h.text}</span>
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
        <h3 className="font-display text-xl font-semibold">
          ¿Quién es <span className="text-gradient">Kratos Labs</span>?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">
          Kratos Labs es el estudio independiente detrás de FocusOne. Diseñamos herramientas para
          mentes que necesitan claridad: software rápido, hermoso y con filosofía AI-First.
          Creemos que la productividad no es hacer más, sino terminar lo que importa.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-xl border border-glass-border bg-black/20 px-3 py-2.5">
              <p className="text-sm font-medium text-core">{p.title}</p>
              <p className="mt-0.5 text-sm text-ink-dim">{p.body}</p>
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
        <h3 className="font-display text-xl font-semibold">Opiniones de la comunidad</h3>
        <p className="mt-1 mb-3 text-sm text-ink-dim">Anónimas y abiertas. Deja la tuya.</p>
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
          <h3 className="font-display text-xl font-semibold">Novedades</h3>
          <span className="badge badge-plasma">v{APP_VERSION}</span>
        </div>
        <p className="mt-1 mb-3 text-sm text-ink-dim">Todo lo que hemos construido, versión a versión.</p>
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
    <GlassPanel className="mx-auto w-full max-w-2xl p-5" tilt={false}>
      {/* Barritas segmentadas */}
      <div className="flex gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            onClick={() => go(i)}
            className="group flex-1"
            aria-label={s.label}
          >
            <span
              className={cn(
                'block h-1 rounded-full transition-all',
                i <= index ? 'plasma-fill' : 'bg-white/10 group-hover:bg-white/20',
              )}
            />
          </button>
        ))}
      </div>

      {/* Cabecera del paso */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-core">
          <Icon size={15} />
          <span className="font-data text-[11px] uppercase tracking-[0.2em]">{slide.label}</span>
        </div>
        <span className="font-data text-[11px] text-ink-ghost">
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
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-glass-border pt-4">
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink disabled:opacity-30"
        >
          <ChevronLeft size={16} /> Atrás
        </button>

        {index < SLIDES.length - 1 ? (
          <button
            onClick={() => go(index + 1)}
            className="flex items-center gap-1 rounded-xl border border-glass-border px-4 py-2 text-sm text-ink transition-all hover:border-glass-border-hi"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-br from-core to-plasma px-4 py-2 text-sm font-medium text-void shadow-glow-core transition-transform hover:scale-[1.03]"
            >
              Crear cuenta
            </Link>
          </div>
        )}
      </div>

      {/* CTA demo persistente */}
      <div className="mt-3 flex justify-center">
        <DemoButton className="w-full sm:w-auto" />
      </div>
    </GlassPanel>
  )
}
