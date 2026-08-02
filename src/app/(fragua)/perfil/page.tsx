import type { Metadata } from 'next'
import Link from 'next/link'
import { Music, Zap, TrendingUp, ChevronRight } from 'lucide-react'
import { getRewardsData } from '@/lib/rewards'
import { RewardsStore } from './_components/RewardsStore'

export const metadata: Metadata = { title: 'Perfil' }
export const dynamic = 'force-dynamic'

const LINKS = [
  { href: '/musica', label: 'Música', hint: 'Frecuencias de foco', icon: Music },
  { href: '/focus', label: 'Deep Work', hint: 'Temporizador de enfoque (duración a tu medida)', icon: Zap },
  { href: '/progreso', label: 'Progreso', hint: 'Racha y puntos', icon: TrendingUp },
]

/**
 * Pantalla "Perfil": accesos y (Fase 6) tienda de recompensas.
 */
export default async function PerfilPage() {
  const { rewards, unlockedIds, points, isDemo } = await getRewardsData()

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">
          El herrero
        </p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">
          Perfil
        </h1>
      </header>

      {/* Accesos */}
      <div className="flex flex-col gap-2">
        {LINKS.map(({ href, label, hint, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-forge border border-forge-line bg-forge-surface p-4 transition-colors hover:border-forge-ink-faint"
          >
            <Icon size={20} className="text-ember" />
            <div className="min-w-0 flex-1">
              <p className="font-forge text-[15px] font-semibold text-forge-ink">{label}</p>
              <p className="truncate text-[13px] text-forge-ink-faint">{hint}</p>
            </div>
            <ChevronRight size={18} className="text-forge-ink-faint" />
          </Link>
        ))}
      </div>

      <RewardsStore
        rewards={rewards}
        unlockedIds={unlockedIds}
        points={points}
        isDemo={isDemo}
      />
    </section>
  )
}
