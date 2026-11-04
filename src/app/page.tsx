import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  Command,
  FolderKanban,
  Keyboard,
  Leaf,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import { KairoLogo, KairoMark } from '@/components/brand/Logo'
import { Badge, Card, Kbd } from '@/components/ui/primitives'
import { DemoButton } from '@/components/auth/DemoButton'
import { ButtonLink } from '@/components/intro/ButtonLink'
import { AppPreview, FocusRingPreview } from '@/components/intro/Preview'
import { Reveal } from '@/components/intro/Reveal'
import { ThemeToggle } from '@/components/intro/ThemeToggle'
import { ReviewsPanel } from '@/components/intro/ReviewsPanel'
import { ChangelogPanel } from '@/components/intro/ChangelogPanel'
import { LiveCapture } from '@/components/intro/LiveCapture'
import { RankingLab } from '@/components/intro/RankingLab'
import { FlowDiagram, FocusDiagram } from '@/components/intro/Diagrams'
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
      <h2 className="mt-3 text-balance font-display text-[40px] leading-[1] tracking-[-0.01em] text-ink sm:text-[56px]">{title}</h2>
      {children && <p className="mt-4 text-[16px] leading-relaxed text-ink-dim sm:text-[17px]">{children}</p>}
    </div>
  )
}

/** Las reglas reales de `scoreTask` (src/lib/kairo/priority.ts), con sus puntos. */
const RULES: { when: string; pts: string }[] = [
  { when: 'La tienes en enfoque ahora', pts: '+1000' },
  { when: 'Venció', pts: '+100, +5 por día (máx. +40)' },
  { when: 'Vence hoy', pts: '+80 · +25 a ≤ 3 h · +30 si pasó' },
  { when: 'Vence mañana', pts: '+40' },
  { when: 'Vence en 2 a 7 días', pts: '+16 a +6' },
  { when: 'Prioridad urgente · alta · media', pts: '+70 · +40 · +15' },
  { when: 'Está en curso', pts: '+60' },
  { when: 'Es de un proyecto activo', pts: '+3 · prioritario +10' },
  { when: 'Lleva 7 días o más esperando', pts: 'hasta +10' },
  { when: 'Se hace en 15 min o menos', pts: '+5' },
]

const MODULES = [
  { icon: FolderKanban, title: 'Proyectos', body: 'Agrupa tareas y mira el avance real: tareas hechas entre tareas totales.' },
  { icon: Target, title: 'Objetivos y hábitos', body: 'Metas medibles o por tareas, y hábitos semanales con racha.' },
  { icon: CalendarDays, title: 'Calendario', body: 'Día y semana con tus tareas y sesiones. Arrastra para cambiar la fecha.' },
  { icon: LineChart, title: 'Estadísticas', body: 'Enfoque por día, constancia y proyectos. Si no hay datos, lo dice.' },
  { icon: Sparkles, title: 'Asistente con IA', body: 'Planifica tu día o divide una tarea grande con tus datos. Tú decides qué se aplica.' },
  { icon: Command, title: 'Atajos y paleta', body: 'N para capturar, F para enfocarte y ⌘K para encontrar cualquier cosa.' },
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

const NAV = [
  { href: '#probar', label: 'Pruébalo' },
  { href: '#como-decide', label: 'Cómo decide' },
  { href: '#enfoque', label: 'Enfoque' },
  { href: '#novedades', label: 'Novedades' },
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
          <Link href="/" aria-label="Kairo, portada" className="mr-auto rounded-control">
            <KairoLogo />
          </Link>
          <nav aria-label="Secciones" className="mr-2 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-control px-2.5 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <ThemeToggle />
          <ButtonLink href="/login" variant="ghost" size="md" className="hidden min-[400px]:inline-flex">
            Entrar
          </ButtonLink>
          <ButtonLink href="/register" variant="primary" size="md">
            Empezar
          </ButtonLink>
        </div>
      </header>

      <main id="contenido">
        {/* ── Hero: la tesis es la propia captura ── */}
        <section id="probar" className={`${CONTAINER} scroll-mt-16 pb-16 pt-12 sm:pb-24 sm:pt-20`}>
          <p className="k-eyebrow flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-fg" aria-hidden />
            De kairós · el momento oportuno
          </p>
          <h1 className="mt-5 font-display text-[56px] leading-[0.92] tracking-[-0.02em] text-ink min-[400px]:text-[64px] sm:text-[96px] lg:text-[120px]">
            Lo importante,
            <br />
            <em className="italic">ahora</em>
            <span
              aria-hidden
              className="ml-[0.05em] inline-block h-[0.15em] w-[0.15em] rounded-full bg-accent align-baseline ring-1 ring-accent-fg/20"
            />
            <span className="sr-only">.</span>
          </h1>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-14">
            <div className="flex min-w-0 flex-col gap-7">
              <p className="max-w-xl text-[17px] leading-relaxed text-ink-dim sm:text-[19px]">
                Escribe lo que tienes que hacer como lo dirías en voz alta. Kairo lo convierte en una tarea, lo ordena con
                reglas que puedes ver y te dice cuál toca ahora.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <ButtonLink href="/register" variant="primary" size="lg" iconRight={<ArrowRight size={16} />}>
                    Empezar gratis
                  </ButtonLink>
                  <DemoButton />
                </div>
                <p className="text-[13px] text-ink-faint">
                  Gratis y sin tarjeta.{' '}
                  <Link href="/login" className="font-medium text-ink-dim underline-offset-4 hover:text-ink hover:underline">
                    Ya tengo cuenta
                  </Link>
                </p>
              </div>
              <dl className="grid max-w-md grid-cols-3 gap-4 border-t border-line pt-5">
                {[
                  { k: 'Fechas', v: '«mañana», «el viernes», «el 28»' },
                  { k: 'Horas', v: '«a las 5», «por la tarde»' },
                  { k: 'Extras', v: '«30 min», «urgente», #etiqueta' },
                ].map((d) => (
                  <div key={d.k} className="min-w-0">
                    <dt className="k-eyebrow">{d.k}</dt>
                    <dd className="mt-1.5 text-[12.5px] leading-snug text-ink-dim">{d.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="min-w-0">
              <LiveCapture />
            </div>
          </div>
        </section>

        {/* ── Vista de producto ── */}
        <section className={`${CONTAINER} pb-20 sm:pb-28`} aria-label="Vista del producto">
          <AppPreview />
          <p className="mt-3 text-center text-[12px] text-ink-faint">Interfaz ilustrativa. Los datos son de ejemplo.</p>
        </section>

        {/* ── Cómo decide ── */}
        <section id="como-decide" className="scroll-mt-16 border-t border-line bg-surface/60 py-20 sm:py-28">
          <div className={CONTAINER}>
            <SectionIntro eyebrow="Tu siguiente movimiento" title="Por qué esta y no otra.">
              Cada tarea abierta suma puntos por reglas simples. La que más suma es tu siguiente movimiento, y los motivos
              se muestran al lado. Cambia una fecha o una prioridad y mira cómo se reordena.
            </SectionIntro>

            <div className="mt-12 grid gap-6 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-8">
                <RankingLab />
              </div>
              <aside className="min-w-0 lg:col-span-4">
                <Card className="p-5">
                  <p className="k-eyebrow">Las reglas, a la vista</p>
                  <dl className="mt-3 divide-y divide-line">
                    {RULES.map((r) => (
                      <div key={r.when} className="flex items-baseline justify-between gap-4 py-2">
                        <dt className="min-w-0 flex-1 text-[13px] text-ink">{r.when}</dt>
                        <dd className="max-w-[55%] text-right font-mono text-[11.5px] tabular-nums text-ink-dim">{r.pts}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
                    Una tarea con subtareas propone su primer paso pendiente, que hereda la fecha y la prioridad de la tarea.
                  </p>
                </Card>
              </aside>
            </div>
          </div>
        </section>

        {/* ── Recorrido ── */}
        <section className="py-20 sm:py-28">
          <div className={CONTAINER}>
            <SectionIntro eyebrow="El recorrido" title="Del texto a tu progreso.">
              Lo que escribes se convierte en tarea, la tarea entra en el ranking y el tiempo que te enfocas acaba en tus
              estadísticas. Sin pasos manuales en medio.
            </SectionIntro>
            <div className="mt-10">
              <FlowDiagram />
            </div>
          </div>
        </section>

        {/* ── Enfoque ── */}
        <section id="enfoque" className="scroll-mt-16 border-t border-line bg-surface/60 py-20 sm:py-28">
          <div className={CONTAINER}>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <SectionIntro eyebrow="Modo enfoque" title="Un temporizador que no se inventa minutos.">
                Una tarea, un reloj y nada más. El tiempo se calcula con la hora real, así que recargar la página no lo
                reinicia. Y si te vas, solo cuenta lo que viste.
              </SectionIntro>
              <div className="flex items-center gap-4 rounded-card border border-line bg-raised p-4 shadow-card" aria-hidden>
                <FocusRingPreview size={92} />
                <div>
                  <p className="k-eyebrow">Enfoque · 1 de 4</p>
                  <p className="mt-1 text-[14px] font-medium text-ink">Revisar apuntes</p>
                  <p className="mt-0.5 text-[12px] text-ink-faint">Pomodoro 25 / 5</p>
                </div>
              </div>
            </div>
            <div className="mt-10">
              <FocusDiagram />
            </div>
          </div>
        </section>

        {/* ── Resto de módulos ── */}
        <section className="py-20 sm:py-28">
          <div className={CONTAINER}>
            <SectionIntro eyebrow="Y además" title="Todo en el mismo sitio." />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map(({ icon: Icon, title, body }, i) => (
                <Reveal key={title} delay={(i % 3) * 0.05}>
                  <Card as="article" className="h-full p-5 sm:p-6">
                    <Icon size={18} strokeWidth={1.9} className="text-ink-dim" aria-hidden />
                    <h3 className="mt-4 flex items-center gap-2 text-[16px] font-semibold tracking-[-0.01em] text-ink">
                      {title}
                      {title === 'Asistente con IA' && <Badge tone="accent">Groq</Badge>}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-dim">{body}</p>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Principios ── */}
        <section className="border-t border-line py-20 sm:py-28">
          <div className={CONTAINER}>
            <SectionIntro eyebrow="Cómo lo pensamos" title="Un buen coach, no un capataz." />
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="border-t border-line pt-5">
                  <Icon size={18} strokeWidth={1.9} className="text-ink-dim" aria-hidden />
                  <h3 className="mt-4 text-[15px] font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Novedades y opiniones ── */}
        <section className="border-t border-line bg-surface/60 py-20 sm:py-28">
          <div className={`${CONTAINER} grid gap-6 lg:grid-cols-2`}>
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
            <Card as="section" className="h-full p-5 sm:p-7">
              <div id="opiniones" className="scroll-mt-24" />
              <div className="mb-6">
                <p className="k-eyebrow">Opiniones</p>
                <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-ink">Qué dice quien lo usa</h2>
                <p className="mt-1.5 text-sm text-ink-dim">Anónimas y abiertas. Deja la tuya.</p>
              </div>
              <ReviewsPanel />
            </Card>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="py-24 sm:py-32">
          <div className={`${CONTAINER} flex flex-col items-center text-center`}>
            <KairoMark className="h-10 w-10 text-ink" />
            <h2 className="mt-6 max-w-3xl text-balance font-display text-[44px] leading-[1] tracking-[-0.01em] text-ink sm:text-[72px]">
              Empieza por lo importante.
            </h2>
            <p className="mt-4 max-w-md text-[16px] text-ink-dim">
              Crea tu cuenta en segundos o pruébalo ahora mismo, sin registro.
            </p>
            <div className="mt-8 flex w-full flex-col justify-center gap-2.5 sm:w-auto sm:flex-row">
              <ButtonLink href="/register" variant="primary" size="lg" iconRight={<ArrowRight size={16} />}>
                Empezar gratis
              </ButtonLink>
              <DemoButton />
            </div>
          </div>
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
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-ink-dim hover:text-ink">
                {n.label}
              </a>
            ))}
            <a href="#opiniones" className="text-ink-dim hover:text-ink">
              Opiniones
            </a>
            <Link href="/login" className="text-ink-dim hover:text-ink">
              Entrar
            </Link>
            <Link href="/register" className="text-ink-dim hover:text-ink">
              Crear cuenta
            </Link>
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
