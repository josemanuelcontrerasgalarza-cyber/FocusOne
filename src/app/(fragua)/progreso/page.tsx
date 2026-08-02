import type { Metadata } from 'next'
import { Flame, Trophy, Gem, Hammer } from 'lucide-react'
import { getProgressData } from '@/lib/missions'

export const metadata: Metadata = { title: 'Progreso' }
export const dynamic = 'force-dynamic'

/**
 * Pantalla "Progreso" (Fase 5): racha, récord, puntos y misiones forjadas.
 */
export default async function ProgresoPage() {
  const { streak, best, points, forged } = await getProgressData()

  const stats = [
    { label: 'Racha actual', value: `${streak}`, unit: streak === 1 ? 'día' : 'días', icon: Flame, tone: 'text-metal' },
    { label: 'Récord', value: `${best}`, unit: best === 1 ? 'día' : 'días', icon: Trophy, tone: 'text-metal' },
    { label: 'Puntos', value: `${points}`, unit: 'pts', icon: Gem, tone: 'text-forge-ink' },
    { label: 'Forjadas', value: `${forged}`, unit: 'misiones', icon: Hammer, tone: 'text-ember' },
  ]

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">
          El temple
        </p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">
          Progreso
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, unit, icon: Icon, tone }) => (
          <div key={label} className="forge-panel p-5">
            <Icon size={18} className={tone} />
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className={`font-num text-3xl font-semibold ${tone}`}>{value}</span>
              <span className="text-sm text-forge-ink-faint">{unit}</span>
            </div>
            <p className="mt-1 text-[13px] text-forge-ink-dim">{label}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-forge-ink-faint">
        La racha sube al forjar al menos una misión al día y se reinicia si dejas pasar un día.
      </p>
    </section>
  )
}
