'use client'

import { useWorkspace } from '@/store/workspace'
import { computeXP, levelFromXP, XP_RULES } from '@/lib/kairo/xp'
import { ProgressBar, ProgressRing, Skeleton } from '@/components/ui/primitives'
import type { Totals } from '@/lib/kairo/types'
import { fmtNum } from './format'

/** Nivel y experiencia: gamificación discreta calculada desde la actividad real. */
export function LevelPanel() {
  const totals = useWorkspace((s) => s.totals)

  const rows = [
    { label: 'Tarea completada', xp: XP_RULES.task, count: totals?.tasksCompleted ?? 0 },
    { label: 'Minuto de enfoque', xp: XP_RULES.focusMinute, count: Math.floor(totals?.focusMinutes ?? 0) },
    { label: 'Día de hábito', xp: XP_RULES.habitLog, count: totals?.habitLogs ?? 0 },
    { label: 'Objetivo cumplido', xp: XP_RULES.goal, count: totals?.goalsAchieved ?? 0 },
  ]

  return (
    <section id="nivel" aria-labelledby="nivel-title" className="scroll-mt-20 rounded-card border border-line bg-surface">
      <div className="px-4 pt-4 sm:px-5">
        <p className="k-eyebrow mb-0.5">Progreso personal</p>
        <h2 id="nivel-title" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          Nivel y experiencia
        </h2>
      </div>

      {!totals ? (
        <div className="px-4 py-4 sm:px-5" aria-busy="true">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-faint">Calculando tu experiencia…</p>
        </div>
      ) : (
        <LevelBody totals={totals} />
      )}

      <div className="border-t border-line px-4 py-4 sm:px-5">
        <table className="w-full text-[13px]">
          <caption className="mb-2 text-left text-[13px] font-medium text-ink">Cómo se gana XP</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Acción</th>
              <th scope="col">XP por acción</th>
              <th scope="col">Tu experiencia</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line/60 first:border-t-0">
                <th scope="row" className="py-1.5 text-left font-normal text-ink-dim">
                  {r.label}
                </th>
                <td className="py-1.5 text-right font-mono text-ink">+{r.xp}</td>
                <td className="w-24 py-1.5 text-right font-mono text-xs text-ink-faint">
                  {totals ? `${fmtNum(r.count * r.xp)} XP` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink-dim">Descansar no resta experiencia.</p>
      </div>
    </section>
  )
}

function LevelBody({ totals }: { totals: Totals }) {
  const lv = levelFromXP(computeXP(totals))
  const left = lv.span - lv.into
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex items-center gap-4">
        <ProgressRing value={lv.progress} size={56} stroke={4}>
          <span className="font-mono text-[17px] font-semibold text-ink" aria-hidden>
            {lv.level}
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">
            Nivel {lv.level} <span className="font-normal text-ink-dim">· {lv.title}</span>
          </p>
          <p className="mt-0.5 font-mono text-xs text-ink-faint">{fmtNum(lv.xp)} XP en total</p>
        </div>
      </div>
      <ProgressBar value={lv.progress} className="mt-4" />
      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-mono text-ink-dim">
          {fmtNum(lv.into)} / {fmtNum(lv.span)} XP
        </span>
        <span className="text-ink-faint">
          {fmtNum(left)} XP para el nivel {lv.level + 1}
        </span>
      </div>
    </div>
  )
}
