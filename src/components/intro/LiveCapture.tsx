'use client'

import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { AtSign, Calendar, Clock, CornerDownLeft, Flag, Hash, Repeat, Timer } from 'lucide-react'
import { parseQuickTask } from '@/lib/kairo/parse'
import { RECURRENCE_LABEL } from '@/lib/kairo/recurrence'
import { PRIORITY_META } from '@/lib/kairo/tasks'
import { relativeDayLabel, shortTime, toDateKey } from '@/lib/kairo/dates'

const EXAMPLES = [
  'Estudiar ciencias mañana durante 30 minutos',
  'Enviar el informe hoy a las 17:00 urgente #clase',
  'Ir al gimnasio cada lunes por la tarde 1 h',
  'Leer el capítulo 4 el viernes 45 min @lectura',
]

/**
 * Demo de la portada: el MISMO parser que usa la captura rápida de la app,
 * ejecutándose en el navegador mientras escribes. No guarda nada.
 */
export function LiveCapture() {
  const [text, setText] = useState(EXAMPLES[0])
  // La fecha "de hoy" solo existe en el cliente; en el servidor se usa una fija
  // para que el HTML inicial y la hidratación coincidan.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const ref = useMemo(() => now ?? new Date('2026-01-14T10:00:00'), [now])
  const today = toDateKey(ref)
  const parsed = useMemo(() => parseQuickTask(text, ref), [text, ref])
  const empty = !text.trim()

  const chips: { icon: React.ReactNode; label: string; tone?: 'warm' }[] = []
  if (parsed.due_date) chips.push({ icon: <Calendar size={12} />, label: relativeDayLabel(parsed.due_date, today) })
  if (parsed.due_time) chips.push({ icon: <Clock size={12} />, label: shortTime(parsed.due_time) ?? parsed.due_time })
  if (parsed.estimated_minutes) chips.push({ icon: <Timer size={12} />, label: `${parsed.estimated_minutes} min` })
  if (parsed.priority && parsed.priority >= 3)
    chips.push({ icon: <Flag size={12} />, label: PRIORITY_META[parsed.priority].label, tone: 'warm' })
  if (parsed.recurrence) chips.push({ icon: <Repeat size={12} />, label: RECURRENCE_LABEL[parsed.recurrence] })
  if (parsed.projectHint) chips.push({ icon: <AtSign size={12} />, label: parsed.projectHint })
  for (const t of parsed.tags) chips.push({ icon: <Hash size={12} />, label: t })

  return (
    <div className="rounded-card border border-line bg-raised shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <p className="k-eyebrow">Pruébalo: escribe una tarea</p>
        <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-fg" aria-hidden />
          parser real
        </span>
      </div>

      <div className="p-4">
        <label htmlFor="landing-capture" className="sr-only">
          Escribe una tarea en lenguaje natural
        </label>
        <input
          id="landing-capture"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          maxLength={160}
          className="k-input h-11 w-full text-[15px]"
          placeholder="Llamar a Ana el lunes a las 5 #trabajo"
        />

        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Ejemplos">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              aria-pressed={ex === text}
              className={clsx(
                'max-w-full truncate rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                ex === text ? 'border-ink/20 bg-sunken text-ink' : 'border-line text-ink-dim hover:border-line-strong hover:text-ink',
              )}
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-ink-faint">
          <CornerDownLeft size={13} aria-hidden />
          <span className="text-[12px]">Kairo entiende</span>
        </div>

        <div className="mt-2 min-h-[92px] rounded-control border border-line bg-surface px-3.5 py-3" aria-live="polite">
          {empty ? (
            <p className="text-[13.5px] text-ink-faint">Escribe algo y verás cómo se ordena solo.</p>
          ) : (
            <>
              <p className="text-[15px] font-medium text-ink">{parsed.title || 'Sin título'}</p>
              {chips.length ? (
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {chips.map((c, i) => (
                    <li
                      key={`${c.label}-${i}`}
                      className={clsx(
                        'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[12px] font-medium',
                        c.tone === 'warm' ? 'border-warm/30 bg-warm/10 text-warm' : 'border-line bg-sunken text-ink-dim',
                      )}
                    >
                      {c.icon}
                      {c.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12.5px] text-ink-faint">Sin fecha ni duración: prueba añadiendo «mañana» o «30 min».</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
