'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { LayoutGroup, MotionConfig, motion } from 'framer-motion'
import { rankTasks, type Scored } from '@/lib/kairo/priority'
import { addDays } from '@/lib/kairo/dates'
import type { Priority, Task } from '@/lib/kairo/types'

/*
 * Laboratorio de la portada: cuatro tareas DE EJEMPLO puntuadas con el mismo
 * `rankTasks` que usa Inicio. Fecha de referencia fija (miércoles 10:00) para
 * que servidor y cliente pinten lo mismo; las etiquetas son relativas.
 */
const REF = '2026-01-14'
const NOW = '10:00'

type Due = 'vencida' | 'hoy' | 'manana' | 'semana' | 'none'
interface Example {
  id: string
  title: string
  due: Due
  time?: string
  priority: Priority
  inProgress: boolean
  estimate: number | null
  waitingDays: number
}

const INITIAL: Example[] = [
  { id: 'a', title: 'Preparar la presentación del trimestre', due: 'hoy', time: '17:00', priority: 3, inProgress: false, estimate: 45, waitingDays: 2 },
  { id: 'b', title: 'Revisar apuntes de química', due: 'manana', priority: 2, inProgress: false, estimate: 15, waitingDays: 1 },
  { id: 'c', title: 'Responder el correo de la profe', due: 'none', priority: 2, inProgress: false, estimate: 10, waitingDays: 20 },
  { id: 'd', title: 'Arreglar la bici', due: 'none', priority: 1, inProgress: true, estimate: null, waitingDays: 3 },
]

const DUE_OPTIONS: { value: Due; label: string }[] = [
  { value: 'vencida', label: 'Venció hace 2 días' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'manana', label: 'Mañana' },
  { value: 'semana', label: 'En 5 días' },
  { value: 'none', label: 'Sin fecha' },
]
const DUE_OFFSET: Record<Exclude<Due, 'none'>, number> = { vencida: -2, hoy: 0, manana: 1, semana: 5 }
const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 4, label: 'Urgente' },
  { value: 3, label: 'Alta' },
  { value: 2, label: 'Media' },
  { value: 1, label: 'Baja' },
]

/** Series del gráfico, en el orden de apilado validado. */
const SERIES = [
  { key: 'due', label: 'Vencimiento', color: 'var(--viz-1)' },
  { key: 'status', label: 'En curso', color: 'var(--viz-2)' },
  { key: 'priority', label: 'Prioridad', color: 'var(--viz-3)' },
  { key: 'other', label: 'Espera y rapidez', color: 'var(--viz-4)' },
] as const
type SeriesKey = (typeof SERIES)[number]['key']

function toTask(e: Example): Task {
  const created = `${addDays(REF, -e.waitingDays)}T09:00:00`
  return {
    id: e.id,
    user_id: 'ejemplo',
    title: e.title,
    description: null,
    status: e.inProgress ? 'in_progress' : 'pending',
    priority: e.priority,
    due_date: e.due === 'none' ? null : addDays(REF, DUE_OFFSET[e.due]),
    due_time: e.due === 'hoy' && e.time ? e.time : null,
    estimated_minutes: e.estimate,
    tags: [],
    parent_id: null,
    project_id: null,
    goal_id: null,
    recurrence: null,
    position: null,
    created_at: created,
    updated_at: created,
    completed_at: null,
  }
}

function parts(s: Scored): Record<SeriesKey, number> {
  const f = s.factors
  return { due: f.due, status: f.status, priority: f.priority, other: f.project + f.age + f.quick }
}

const selectCls =
  'h-7 rounded-md border border-line bg-surface px-1.5 text-[12px] text-ink-dim transition-colors hover:border-line-strong focus-visible:text-ink'

export function RankingLab() {
  const [items, setItems] = useState(INITIAL)
  const [hover, setHover] = useState<{ id: string; key: SeriesKey } | null>(null)

  const ranked = useMemo(() => rankTasks(items.map(toTask), { today: REF, nowTime: NOW }), [items])
  const byId = useMemo(() => new Map(items.map((e) => [e.id, e])), [items])
  const max = Math.max(150, Math.ceil(Math.max(...ranked.map((r) => r.score)) / 50) * 50)
  const ticks = Array.from({ length: max / 50 + 1 }, (_, i) => i * 50)
  const top = ranked[0]

  const update = (id: string, patch: Partial<Example>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const changed = items.some((x, i) => JSON.stringify(x) !== JSON.stringify(INITIAL[i]))

  return (
    <MotionConfig reducedMotion="user">
      <div className="rounded-card border border-line bg-surface">
        {/* Resumen: la decisión arriba, el detalle debajo */}
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="k-eyebrow">Tu siguiente movimiento</p>
            <p className="mt-1 truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">{top.task.title}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Motivos">
              {top.reasons.slice(0, 3).map((r) => (
                <li key={r} className="inline-flex h-6 items-center rounded-md border border-line bg-sunken px-2 text-[12px] text-ink-dim">
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <p className="font-mono text-[11px] text-ink-faint">Datos de ejemplo</p>
            {changed && (
              <button type="button" onClick={() => setItems(INITIAL)} className="text-[12.5px] font-medium text-ink-dim underline-offset-4 hover:text-ink hover:underline">
                Restablecer
              </button>
            )}
          </div>
        </div>

        {/* Leyenda (siempre, hay 4 series) */}
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 pt-4 sm:px-5" aria-label="Leyenda">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5 text-[12px] text-ink-dim">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>

        {/* Eje superior compartido */}
        <div className="px-4 pt-3 sm:px-5" aria-hidden>
          <div className="relative ml-7 mr-12 h-4">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-0 -translate-x-1/2 font-mono text-[10px] tabular-nums text-ink-faint"
                style={{ left: `${(t / max) * 100}%` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <LayoutGroup>
          <ol className="px-4 pb-3 sm:px-5" aria-label="Tareas ordenadas por puntuación">
            {ranked.map((r, i) => {
              const e = byId.get(r.task.id)!
              const p = parts(r)
              let acc = 0
              const segs = SERIES.map((s) => {
                const v = p[s.key]
                const seg = { ...s, v, left: acc }
                acc += v
                return seg
              }).filter((s) => s.v > 0)
              const label = `${r.task.title}: ${r.score} puntos. ${segs.map((s) => `${s.label} ${s.v}`).join(', ')}.`
              return (
                <motion.li
                  key={r.task.id}
                  layout="position"
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  className="border-t border-line py-3 first:border-t-0"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span
                      className={clsx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px]',
                        i === 0 ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink-faint',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 basis-48 truncate text-[14px] font-medium text-ink">{r.task.title}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        id={`lab-due-${e.id}`}
                        aria-label={`Vencimiento de ${e.title}`}
                        value={e.due}
                        onChange={(ev) => update(e.id, { due: ev.target.value as Due })}
                        className={selectCls}
                      >
                        {DUE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.value === 'hoy' && e.time ? `Hoy a las ${e.time}` : o.label}
                          </option>
                        ))}
                      </select>
                      <select
                        id={`lab-prio-${e.id}`}
                        aria-label={`Prioridad de ${e.title}`}
                        value={e.priority}
                        onChange={(ev) => update(e.id, { priority: Number(ev.target.value) as Priority })}
                        className={selectCls}
                      >
                        {PRIORITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-[12px] text-ink-dim hover:border-line-strong">
                        <input
                          id={`lab-prog-${e.id}`}
                          type="checkbox"
                          checked={e.inProgress}
                          onChange={(ev) => update(e.id, { inProgress: ev.target.checked })}
                          className="accent-[rgb(var(--accent-fg))]"
                        />
                        En curso
                      </label>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="w-5 shrink-0" aria-hidden />
                    <div className="relative h-3.5 min-w-0 flex-1" role="img" aria-label={label}>
                      {ticks.map((t) => (
                        <span
                          key={t}
                          aria-hidden
                          className={clsx('absolute inset-y-[-4px] w-px', t === 0 ? 'bg-line-strong' : 'bg-line/70')}
                          style={{ left: `${(t / max) * 100}%` }}
                        />
                      ))}
                      {segs.map((s, si) => {
                        const last = si === segs.length - 1
                        const on = hover?.id === r.task.id && hover.key === s.key
                        return (
                          <span
                            key={s.key}
                            onMouseEnter={() => setHover({ id: r.task.id, key: s.key })}
                            onMouseLeave={() => setHover(null)}
                            className={clsx(
                              'absolute inset-y-0 transition-[left,width,opacity] duration-300 ease-out',
                              last && 'rounded-r-[4px]',
                              hover && hover.id === r.task.id && !on && 'opacity-55',
                            )}
                            style={{
                              left: `${(s.left / max) * 100}%`,
                              width: `calc(${(s.v / max) * 100}% - ${last ? 0 : 2}px)`,
                              background: s.color,
                            }}
                          >
                            {on && (
                              <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-raised px-2 py-1 text-[11.5px] text-ink shadow-pop">
                                {s.label} · <span className="font-mono tabular-nums">{s.v}</span> pts
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </div>
                    <span className="w-10 shrink-0 text-right font-mono text-[12px] tabular-nums text-ink">{r.score}</span>
                  </div>
                </motion.li>
              )
            })}
          </ol>
        </LayoutGroup>

        <details className="group border-t border-line px-4 py-3 sm:px-5">
          <summary className="cursor-pointer select-none text-[12.5px] font-medium text-ink-dim hover:text-ink">
            Ver los puntos en una tabla
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12.5px]">
              <thead>
                <tr className="text-ink-faint">
                  <th className="py-1.5 pr-3 font-medium">Tarea</th>
                  {SERIES.map((s) => (
                    <th key={s.key} className="px-2 py-1.5 text-right font-medium">
                      {s.label}
                    </th>
                  ))}
                  <th className="py-1.5 pl-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-ink">
                {ranked.map((r) => {
                  const p = parts(r)
                  return (
                    <tr key={r.task.id} className="border-t border-line">
                      <td className="py-1.5 pr-3 font-sans">{r.task.title}</td>
                      {SERIES.map((s) => (
                        <td key={s.key} className="px-2 py-1.5 text-right">
                          {p[s.key]}
                        </td>
                      ))}
                      <td className="py-1.5 pl-2 text-right font-medium">{r.score}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </details>
      </div>
      <p className="mt-3 text-[12px] text-ink-faint">
        Mismo cálculo que la pantalla Inicio, en tu navegador. Referencia: un miércoles a las 10:00.
      </p>
    </MotionConfig>
  )
}
