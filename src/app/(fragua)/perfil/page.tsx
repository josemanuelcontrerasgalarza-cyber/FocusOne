import type { Metadata } from 'next'
import Link from 'next/link'
import { Music, Zap, TrendingUp, PawPrint, ChevronRight } from 'lucide-react'
import { getRewardsData } from '@/lib/rewards'
import { getPetData } from '@/lib/pet'
import { RewardsStore } from './_components/RewardsStore'
import { WeeklyDrops } from './_components/WeeklyDrops'
import { LogoutButton } from '@/components/forge/LogoutButton'

export const metadata: Metadata = { title: 'Perfil' }
export const dynamic = 'force-dynamic'

const LINKS = [
  { href: '/mascota', label: 'Focus Pet', hint: 'Adopta y viste tu mascota de enfoque', icon: PawPrint },
  { href: '/musica', label: 'Música', hint: 'Frecuencias de foco', icon: Music },
  { href: '/deep-work', label: 'Deep Work', hint: 'Temporizador de enfoque (duración a tu medida)', icon: Zap },
  { href: '/progreso', label: 'Progreso', hint: 'Racha y puntos', icon: TrendingUp },
]

export default async function PerfilPage() {
  const [{ rewards, unlockedIds, points, isDemo }, pet] = await Promise.all([
    getRewardsData(),
    getPetData(),
  ])

  // Rotación semanal de ropa de Focus Pet — determinista por número de semana.
  const clothing = pet.catalog.filter((i) => i.kind !== 'pet')
  const week = Math.floor(Date.now() / (7 * 86400000))
  const featured =
    clothing.length === 0
      ? []
      : Array.from({ length: Math.min(3, clothing.length) }, (_, k) =>
          clothing[(week + k) % clothing.length],
        )

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">
          El herrero
        </p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">Perfil</h1>
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

      {/* Ropa de la semana (Focus Pet) */}
      <WeeklyDrops
        featured={featured}
        ownedIds={pet.ownedIds}
        points={pet.points}
        isDemo={pet.isDemo}
      />

      {/* Tienda de recompensas */}
      <RewardsStore
        rewards={rewards}
        unlockedIds={unlockedIds}
        points={points}
        isDemo={isDemo}
      />

      <LogoutButton />
    </section>
  )
}
