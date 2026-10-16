import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  Clock,
  CornerDownLeft,
  Keyboard,
  Leaf,
  LineChart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { KairoLogo, KairoMark } from '@/components/brand/Logo'
import { Badge, Card, Kbd, ProgressBar } from '@/components/ui/primitives'
import { DemoButton } from '@/components/auth/DemoButton'
import { ButtonLink } from '@/components/intro/ButtonLink'
import { AppPreview, FocusRingPreview, WeekBarsPreview } from '@/components/intro/Preview'
import { Reveal } from '@/components/intro/Reveal'
import { ThemeToggle } from '@/components/intro/ThemeToggle'
import { ReviewsPanel } from '@/components/intro/ReviewsPanel'
import { ChangelogPanel } from '@/components/intro/ChangelogPanel'
import { APP_VERSION } from '@/lib/changelog'

const DESCRIPTION =
  'Kairo te dice qué hacer a continuación, te ayuda a concentrarte y te muestra tu progreso real. Tareas en lenguaje natural, modo enfoque, proyectos, objetivos, estadísticas y un asistente con IA.'

export const metadata: Metadata = {
  title: { absolute: 'Kairo — Lo importante, ahora' },
  description: DESCRIPTION,
  keywords: [
    'Kairo',
    'productividad',
    'tareas',
    'lista de tareas',
    'enfoque',
    'pomodoro',
    'proyectos',
    'objetivos',
    'estadísticas',
    'asistente IA',
    'Kratos Labs',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Kairo — Lo importante, ahora',
    description: 'Decide qué hacer, concéntrate y mide tu progreso real.',
    url: '/',
    type: 'website',
    locale: 'es_ES',
    siteName: 'Kairo',
  },
}

const CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-8'

/* ───────────────────────── piezas de la portada ───────────────────────── */

function SectionIntro({ eyebrow, title, children }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="k-eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-display text-[40px] leading-[1] tracking-[-0.01em] text-ink sm:text-[56px]">{title}</h2>
      {children && <p className="mt-4 text-[16px] leading-relaxed text-ink-dim sm:text-[17px]">{children}</p>}
    </div>
  )
}

function Feature({
  n,
  title,
  body,
  children,
  className,
}: {
  n: string
  title: string
  body: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <Card as="article" className={`flex flex-col overflow-hidden ${className ?? ''}`}>
      <div className="p-5 sm:p-6">
        <p className="font-mono text-[11px] text-ink-faint">{n}</p>
        <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.015em] text-ink">{title}</h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-dim">{body}</p>
      </div>
      {children && (
        <div aria-hidden className="mt-auto border-t border-line bg-canvas/60 p-5 sm:p-6">
          {children}
        </div>
      )}
    </Card>
  )
}

const RANKED = [
  { title: 'Preparar la presentación del trimestre', why: ['Vence hoy a las 17:00', 'Prioridad alta'], top: true },
  { title: 'Revisar apuntes de química', why: ['Vence mañana'] },
  { title: 'Ordenar el escritorio', why: ['Sin fecha'] },
]

const PRINCIPLES = [
  {
    icon: Leaf,
    title: 'Calma, sin culpa',
    body: 'Mensajes claros y sin presión. Descansar también cuenta: tu progreso nunca se resta.',
  },
  {
    icon: LineChart,
    title: 'Progreso real',
    body: 'Niveles y estadísticas que salen de lo que haces de verdad. No se compran ni se inventan.',
  },
  {
    icon: Keyboard,
    title: 'Rápido de usar',
    body: (
      <>
        Pulsa <Kbd>N</Kbd> para capturar una tarea y <Kbd>⌘</Kbd>
        <Kbd>K</Kbd> para encontrar cualquier cosa.
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: 'Tus datos, tuyos',
    body: 'Cada dato está aislado por usuario en la base de datos. Y puedes empezar sin registrarte.',
  },
]

/* ───────────────────────────── página ───────────────────────────── */

export default function LandingPage() {
  // Datos estructurados (Schema.org). `alternateName` mantiene la continuidad
  // con el nombre anterior del producto para los buscadores.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Kairo',
    alternateName: ['FocusOne'],
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    url: 'https://focusone.vercel.app',
    description: DESCRIPTION,
    inLanguage: 'es',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'Kratos Labs' },
  }
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-control focus:bg-raised focus:px-3 focus:py-2 focus:text-sm focus:shadow-pop"
      >
        Saltar al contenido
      </a>

      {/* ── Cabecera ── */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
        <div className={`${CONTAINER} flex h-14 items-center gap-2`}>
          <Link href="/" aria-label="Kairo — portada" className="mr-auto rounded-control">
            <KairoLogo />
          </Link>
          <nav aria-label="Secciones" className="mr-2 hidden items-center gap-1 md:flex">
            <a href="#producto" className="rounded-control px-2.5 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
              Producto
            </a>
            <a href="#novedades" className="rounded-control px-2.5 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
              Novedades
            </a>
            <a href="#opiniones" className="rounded-control px-2.5 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
              Opiniones
            </a>
          </nav>
          <ThemeToggle />
          <ButtonLink href="/login" variant="ghost" size="sm" className="h-9 px-3 text-sm">
            Entrar
          </ButtonLink>
          <ButtonLink href="/register" variant="primary" size="sm" className="h-9 px-3.5 text-sm">
            Empezar
          </ButtonLink>
        </div>
      </header>

      <main id="contenido">
        {/* ── Hero ── */}
        <section className={`${CONTAINER} pb-10 pt-14 sm:pt-24`}>
          <p className="k-eyebrow flex animate-fade-in items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-fg" aria-hidden />
            De kairós · el momento oportuno
          </p>
          <h1 className="mt-5 animate-fade-in font-display text-[56px] leading-[0.92] tracking-[-0.02em] text-ink [animation-delay:60ms] [animation-fill-mode:both] min-[400px]:text-[64px] sm:text-[96px] lg:text-[124px]">
            Lo importante,
            <br />
            <em className="italic">ahora</em>
            <span
              aria-hidden
              className="ml-[0.05em] inline-block h-[0.15em] w-[0.15em] rounded-full bg-accent align-baseline ring-1 ring-accent-fg/20"
            />
            <span className="sr-only">.</span>
          </h1>

          <div className="mt-8 grid animate-fade-in gap-8 [animation-delay:120ms] [animation-fill-mode:both] lg:mt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <p className="max-w-xl text-[17px] leading-relaxed text-ink-dim sm:text-[19px]">
              Kairo te dice qué hacer a continuación, te ayuda a concentrarte y te muestra tu progreso real.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <ButtonLink href="/register" variant="primary" size="lg" iconRight={<ArrowRight size={16} />}>
                  Empezar gratis
                </ButtonLink>
                <DemoButton />
              </div>
              <p className="text-center text-[13px] text-ink-faint sm:text-left">
                Gratis y sin tarjeta.{' '}
                <Link href="/login" className="font-medium text-ink-dim underline-offset-4 hover:text-ink hover:underline">
                  Ya tengo cuenta
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── Vista de producto ── */}
        <section className={`${CONTAINER} pb-20 sm:pb-28`} aria-label="Vista del producto">
          <Reveal>
            <AppPreview />
            <p className="mt-3 text-center text-[12px] text-ink-faint">Interfaz ilustrativa. Los datos son de ejemplo.</p>
          </Reveal>
        </section>

        {/* ── Producto ── */}
        <section id="producto" className="scroll-mt-16 border-t border-line bg-surface/60 py-20 sm:py-28">
          <div className={CONTAINER}>
            <Reveal>
              <SectionIntro eyebrow="Producto" title="Menos decidir. Más avanzar.">
                Todo lo necesario para pasar de una lista larga a un paso claro, y darlo.
              </SectionIntro>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <Reveal className="sm:col-span-2 lg:col-span-4">
                <Feature
                  n="01"
                  title="Tu siguiente movimiento"
                  className="h-full"
                  body="Kairo ordena tus tareas abiertas con reglas claras (vencimiento, prioridad, proyecto, tiempo en espera) y te propone una. Siempre te dice por qué."
                >
                  <ol className="space-y-2">
                    {RANKED.map((r, i) => (
                      <li
                        key={r.title}
                        className={`flex items-center gap-3 rounded-control border px-3 py-2.5 ${
                          r.top ? 'border-accent-fg/30 bg-raised shadow-card' : 'border-transparent opacity-60'
                        }`}
                      >
                        <span className="w-4 font-mono text-[12px] text-ink-faint">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{r.title}</span>
                        <span className="hidden shrink-0 gap-1.5 sm:flex">
                          {r.why.map((w) => (
                            <Badge key={w} tone={r.top && w.startsWith('Vence') ? 'warm' : 'neutral'}>
                              {w}
                            </Badge>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Feature>
              </Reveal>

              <Reveal className="lg:col-span-2" delay={0.05}>
                <Feature
                  n="02"
                  title="Tareas en lenguaje natural"
                  className="h-full"
                  body="Escribe como hablas. Kairo entiende la fecha, la hora, la duración y las etiquetas."
                >
                  <div className="rounded-control border border-line bg-raised px-3 py-2.5 text-[13px] text-ink">
                    Estudiar ciencias mañana durante 30 minutos
                    <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-ink" />
                  </div>
                  <div className="mt-2 flex items-center gap-2 px-1 text-ink-faint">
                    <CornerDownLeft size={13} />
                    <span className="text-[12px]">se convierte en</span>
                  </div>
                  <div className="mt-2 rounded-control border border-line bg-surface px-3 py-2.5">
                    <p className="text-[13.5px] font-medium text-ink">Estudiar ciencias</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge>
                        <Calendar size={11} /> Mañana
                      </Badge>
                      <Badge>
                        <Clock size={11} /> 30 min
                      </Badge>
                    </div>
                  </div>
                </Feature>
              </Reveal>

              <Reveal className="lg:col-span-2">
                <Feature
                  n="03"
                  title="Modo enfoque"
                  className="h-full"
                  body="Una tarea, un temporizador y nada más. Sigue contando aunque recargues la página."
                >
                  <div className="flex items-center gap-4">
                    <FocusRingPreview size={96} />
                    <div className="min-w-0">
                      <p className="k-eyebrow">En curso</p>
                      <p className="mt-1 truncate text-[13.5px] font-medium text-ink">Revisar apuntes</p>
                      <p className="mt-0.5 text-[12px] text-ink-faint">Sesión de 25 min</p>
                    </div>
                  </div>
                </Feature>
              </Reveal>

              <Reveal className="lg:col-span-2" delay={0.05}>
                <Feature
                  n="04"
                  title="Proyectos y objetivos"
                  className="h-full"
                  body="Agrupa tareas en proyectos y conéctalas con objetivos medibles. El avance se calcula solo."
                >
                  <div className="space-y-3.5">
                    {[
                      { name: 'Lanzamiento web', v: 0.64, label: '64 %' },
                      { name: 'Leer 12 libros', v: 7 / 12, label: '7 / 12' },
                    ].map((p) => (
                      <div key={p.name}>
                        <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                          <span className="font-medium text-ink">{p.name}</span>
                          <span className="font-mono text-[11px] text-ink-faint">{p.label}</span>
                        </div>
                        <ProgressBar value={p.v} />
                      </div>
                    ))}
                  </div>
                </Feature>
              </Reveal>

              <Reveal className="lg:col-span-2" delay={0.1}>
                <Feature
                  n="05"
                  title="Estadísticas reales"
                  className="h-full"
                  body="Tiempo de enfoque, tareas completadas y constancia, a partir de lo que de verdad hiciste."
                >
                  <WeekBarsPreview className="h-20" />
                </Feature>
              </Reveal>

              <Reveal className="sm:col-span-2 lg:col-span-6">
                <Card as="article" className="grid overflow-hidden lg:grid-cols-2">
                  <div className="p-5 sm:p-6 lg:p-8">
                    <p className="font-mono text-[11px] text-ink-faint">06</p>
                    <h3 className="mt-3 flex items-center gap-2 text-[19px] font-semibold tracking-[-0.015em] text-ink">
                      Asistente con IA
                      <Badge tone="accent">
                        <Sparkles size={11} /> Groq
                      </Badge>
                    </h3>
                    <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-dim">
                      Pregúntale qué hacer con el tiempo que tienes, pídele que divida una tarea grande o que planifique tu
                      día con tus datos. Si el servidor no tiene la IA configurada, te lo dice y sigues con todo lo demás.
                    </p>
                  </div>
                  <div aria-hidden className="space-y-3 border-t border-line bg-canvas/60 p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-8">
                    <div className="ml-auto w-fit max-w-[85%] rounded-card rounded-br-[4px] bg-ink px-3.5 py-2.5 text-[13.5px] text-canvas">
                      Tengo 20 minutos libres. ¿Qué hago?
                    </div>
                    <div className="flex max-w-[92%] gap-2.5">
                      <KairoMark className="mt-1 h-5 w-5 shrink-0 text-ink" />
                      <div className="rounded-card rounded-tl-[4px] border border-line bg-surface px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">
                        Revisa los apuntes de química: te lleva unos 15 minutos y vence mañana. Así llegas con margen a la
                        presentación de las 17:00.
                      </div>
                    </div>
                  </div>
                </Card>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Principios ── */}
        <section className="py-20 sm:py-28">
          <div className={CONTAINER}>
            <Reveal>
              <SectionIntro eyebrow="Cómo lo pensamos" title="Un buen coach, no un capataz." />
            </Reveal>
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map(({ icon: Icon, title, body }, i) => (
                <Reveal key={title} delay={i * 0.05}>
                  <div className="border-t border-line pt-5">
                    <Icon size={18} strokeWidth={1.9} className="text-ink-dim" aria-hidden />
                    <h3 className="mt-4 text-[15px] font-semibold text-ink">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Novedades y opiniones ── */}
        <section className="border-t border-line bg-surface/60 py-20 sm:py-28">
          <div className={`${CONTAINER} grid gap-6 lg:grid-cols-2`}>
            <Reveal className="h-full">
              <Card as="section" className="h-full p-5 sm:p-7">
                <div id="novedades" className="scroll-mt-24" />
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div>
                    <p className="k-eyebrow">Novedades</p>
                    <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-ink">Lo último que hemos hecho</h2>
                  </div>
                  <Badge tone="accent">v{APP_VERSION}</Badge>
                </div>
                <ChangelogPanel />
              </Card>
            </Reveal>
            <Reveal className="h-full" delay={0.05}>
              <Card as="section" className="h-full p-5 sm:p-7">
                <div id="opiniones" className="scroll-mt-24" />
                <div className="mb-6">
                  <p className="k-eyebrow">Opiniones</p>
                  <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-ink">Qué dice quien lo usa</h2>
                  <p className="mt-1.5 text-sm text-ink-dim">Anónimas y abiertas. Deja la tuya.</p>
                </div>
                <ReviewsPanel />
              </Card>
            </Reveal>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="py-24 sm:py-32">
          <Reveal className={`${CONTAINER} flex flex-col items-center text-center`}>
            <KairoMark className="h-10 w-10 text-ink" />
            <h2 className="mt-6 max-w-3xl font-display text-[44px] leading-[1] tracking-[-0.01em] text-ink sm:text-[72px]">
              Empieza por lo importante.
            </h2>
            <p className="mt-4 max-w-md text-[16px] text-ink-dim">
              Crea tu cuenta en segundos o pruébalo ahora mismo, sin registro. Tu progreso se guarda después.
            </p>
            <div className="mt-8 flex w-full flex-col justify-center gap-2.5 sm:w-auto sm:flex-row">
              <ButtonLink href="/register" variant="primary" size="lg" iconRight={<ArrowRight size={16} />}>
                Empezar gratis
              </ButtonLink>
              <DemoButton />
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── Pie ── */}
      <footer className="border-t border-line">
        <div className={`${CONTAINER} flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between`}>
          <div>
            <KairoLogo />
            <p className="mt-2 text-sm text-ink-dim">Lo importante, ahora.</p>
          </div>
          <nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:gap-x-12">
            <a href="#producto" className="text-ink-dim hover:text-ink">
              Producto
            </a>
            <Link href="/login" className="text-ink-dim hover:text-ink">
              Entrar
            </Link>
            <a href="#novedades" className="text-ink-dim hover:text-ink">
              Novedades
            </a>
            <Link href="/register" className="text-ink-dim hover:text-ink">
              Crear cuenta
            </Link>
            <a href="#opiniones" className="text-ink-dim hover:text-ink">
              Opiniones
            </a>
          </nav>
        </div>
        <div className={`${CONTAINER} flex flex-col gap-1 border-t border-line py-5 text-xs text-ink-faint sm:flex-row sm:justify-between`}>
          <p>© {year} Kratos Labs</p>
          <p className="font-mono">Kairo v{APP_VERSION}</p>
        </div>
      </footer>
    </div>
  )
}
