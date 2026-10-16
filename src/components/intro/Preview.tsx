import clsx from 'clsx'
import {
  BarChart3,
  CalendarDays,
  Check,
  CheckSquare,
  Clock,
  FolderKanban,
  Home,
  Search,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react'
import { KairoMark } from '@/components/brand/Logo'

/*
 * Vistas ILUSTRATIVAS del producto, hechas en HTML/CSS con los mismos tokens
 * que la app. No son capturas ni datos reales: quien las muestre debe
 * indicarlo ("Interfaz ilustrativa"). Todo es decorativo (aria-hidden) y se
 * describe con una etiqueta en el contenedor.
 */

/** Chip neutro, como los motivos de "Tu siguiente movimiento". */
function Reason({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'warm' }) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-[12px] font-medium',
        tone === 'accent' && 'border-accent-fg/25 bg-accent/15 text-accent-fg',
        tone === 'warm' && 'border-warm/25 bg-warm/10 text-warm',
        tone === 'neutral' && 'border-line bg-sunken text-ink-dim',
      )}
    >
      {children}
    </span>
  )
}

/** Botón de mentira (no interactivo) con el aspecto de Button. */
function FakeButton({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-control px-3 text-[13px] font-medium',
        primary ? 'bg-accent font-semibold text-accent-ink' : 'border border-line bg-raised text-ink',
      )}
    >
      {children}
    </span>
  )
}

/** Tarjeta "Tu siguiente movimiento" (ilustrativa). */
export function NextMovePreview({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-card border border-line bg-surface p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="k-eyebrow">Tu siguiente movimiento</p>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-fg" />
          Ahora
        </span>
      </div>
      <p className="mt-2.5 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-[19px]">
        Preparar la presentación del trimestre
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Reason tone="warm">Vence hoy a las 17:00</Reason>
        <Reason>Prioridad alta</Reason>
        <Reason>
          <Clock size={12} /> 45 min
        </Reason>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <FakeButton primary>
          <Timer size={14} /> Empezar enfoque
        </FakeButton>
        <FakeButton>
          <Check size={14} /> Hecho
        </FakeButton>
      </div>
    </div>
  )
}

const ROWS: { title: string; meta: string[]; done?: boolean; tag?: string; prio?: boolean }[] = [
  { title: 'Responder al equipo de diseño', meta: ['Hoy'], done: true },
  { title: 'Revisar apuntes de química', meta: ['Hoy', '15 min'], tag: 'estudio' },
  { title: 'Llamar al dentista', meta: ['Hoy · 12:30'], prio: true },
  { title: 'Estudiar ciencias', meta: ['Mañana', '30 min'], tag: 'estudio' },
]

function TaskRowPreview({ row }: { row: (typeof ROWS)[number] }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
      <span
        className={clsx(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
          row.done ? 'border-accent-fg bg-accent-fg text-canvas' : row.prio ? 'border-warm' : 'border-line-strong',
        )}
      >
        {row.done && <Check size={11} strokeWidth={3} />}
      </span>
      <span className={clsx('min-w-0 flex-1 truncate text-[13.5px]', row.done ? 'text-ink-faint line-through' : 'text-ink')}>
        {row.title}
      </span>
      <span className="hidden shrink-0 items-center gap-2 text-[12px] text-ink-faint min-[420px]:flex">
        {row.tag && <span className="text-ink-dim">#{row.tag}</span>}
        {row.meta.map((m) => (
          <span key={m} className="font-mono">
            {m}
          </span>
        ))}
      </span>
    </div>
  )
}

/** Lista "Hoy" (ilustrativa). */
export function TodayListPreview({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-card border border-line bg-surface', className)}>
      <div className="flex items-center justify-between px-3 pb-1.5 pt-3 sm:px-4">
        <p className="text-[13px] font-semibold text-ink">Hoy</p>
        <p className="font-mono text-[11px] text-ink-faint">1 / 4</p>
      </div>
      <div className="divide-y divide-line">
        {ROWS.map((r) => (
          <TaskRowPreview key={r.title} row={r} />
        ))}
      </div>
    </div>
  )
}

/** Anillo de enfoque (ilustrativo). */
export function FocusRingPreview({ size = 112, className }: { size?: number; className?: string }) {
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-sunken" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-accent-fg"
          strokeDasharray={c}
          strokeDashoffset={c * 0.38}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[22px] font-medium tracking-[-0.02em] text-ink">15:24</span>
        <span className="text-[10px] text-ink-faint">de 25:00</span>
      </div>
    </div>
  )
}

const WEEK = [0.35, 0.6, 0.45, 0.8, 0.55, 0.25, 0.15]
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Barras semanales (ilustrativas). */
export function WeekBarsPreview({ className, highlight = 3 }: { className?: string; highlight?: number }) {
  return (
    <div className={clsx('flex h-24 items-end gap-2', className)}>
      {WEEK.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-full w-full items-end">
            <div
              className={clsx('w-full rounded-[4px]', i === highlight ? 'bg-accent-fg' : 'bg-line-strong/70')}
              style={{ height: `${Math.round(v * 100)}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-ink-faint">{DAYS[i]}</span>
        </div>
      ))}
    </div>
  )
}

const NAV = [
  { label: 'Inicio', icon: Home, active: true },
  { label: 'Tareas', icon: CheckSquare },
  { label: 'Enfoque', icon: Timer },
  { label: 'Calendario', icon: CalendarDays },
  { label: 'Proyectos', icon: FolderKanban },
  { label: 'Objetivos', icon: Target },
  { label: 'Estadísticas', icon: BarChart3 },
  { label: 'Asistente', icon: Sparkles },
]

/** Ventana de producto completa (ilustrativa) para la portada. */
export function AppPreview({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Vista ilustrativa de la pantalla de Inicio de Kairo: tu siguiente movimiento, la lista de hoy y una sesión de enfoque en curso."
      className={clsx('overflow-hidden rounded-[18px] border border-line bg-canvas shadow-pop', className)}
    >
      <div aria-hidden>
        {/* Barra superior */}
        <div className="flex h-11 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
          <KairoMark className="h-5 w-5 text-ink" />
          <span className="text-[13px] font-medium text-ink">Inicio</span>
          <span className="ml-auto hidden h-7 w-56 items-center gap-2 rounded-control border border-line bg-canvas px-2.5 text-[12px] text-ink-faint sm:flex">
            <Search size={13} />
            Buscar o ejecutar…
            <span className="ml-auto font-mono text-[10px]">⌘K</span>
          </span>
          <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full border border-line bg-sunken text-[11px] font-semibold text-ink sm:ml-0">
            A
          </span>
        </div>

        <div className="grid sm:grid-cols-[176px_minmax(0,1fr)] lg:grid-cols-[196px_minmax(0,1fr)_248px]">
          {/* Barra lateral */}
          <div className="hidden border-r border-line bg-surface p-2.5 sm:block">
            {NAV.map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={clsx(
                  'flex h-8 items-center gap-2.5 rounded-control px-2 text-[13px]',
                  active ? 'bg-raised font-medium text-ink shadow-card' : 'text-ink-dim',
                )}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.9} className={active ? 'text-ink' : 'text-ink-faint'} />
                {label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-fg" />}
              </div>
            ))}
          </div>

          {/* Contenido */}
          <div className="min-w-0 space-y-4 p-4 sm:p-5">
            <div>
              <p className="font-display text-[28px] leading-none tracking-[-0.01em] text-ink sm:text-[32px]">Buenas tardes.</p>
              <p className="mt-1.5 text-[13px] text-ink-dim">Tres tareas abiertas para hoy. Empieza por esta.</p>
            </div>
            <NextMovePreview />
            <TodayListPreview />
          </div>

          {/* Columna derecha */}
          <div className="hidden space-y-4 border-l border-line p-5 lg:block">
            <div className="rounded-card border border-line bg-surface p-4">
              <p className="k-eyebrow">Enfoque</p>
              <div className="mt-3 flex justify-center">
                <FocusRingPreview size={120} />
              </div>
              <p className="mt-3 truncate text-center text-[12px] text-ink-dim">Revisar apuntes de química</p>
            </div>
            <div className="rounded-card border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <p className="k-eyebrow">Esta semana</p>
                <span className="font-mono text-[11px] text-ink-faint">min</span>
              </div>
              <WeekBarsPreview className="mt-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
