import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Music2, PawPrint, Settings, ShoppingBag, Users } from 'lucide-react'
import { getRewardsData } from '@/lib/rewards'
import { getPetData } from '@/lib/pet'
import { getDailyClaim } from '@/lib/daily'
import { Badge, Card, CardHeader, PageHeader } from '@/components/ui/primitives'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { ProfileSummary } from './_components/ProfileSummary'
import { DailyClaim } from './_components/DailyClaim'
import { RewardsStore } from './_components/RewardsStore'
import { WeeklyDrops } from './_components/WeeklyDrops'
import { DevPanel } from './_components/DevPanel'

export const metadata: Metadata = { title: 'Perfil y recompensas' }
export const dynamic = 'force-dynamic'

const LINKS = [
  { href: '/tienda', label: 'Tienda', hint: 'Colecciona ítems con tus puntos', icon: ShoppingBag },
  { href: '/mascota', label: 'Mascota', hint: 'Adopta y viste a tu compañero', icon: PawPrint },
  { href: '/amigos', label: 'Amigos', hint: 'Compara rachas y puntos', icon: Users },
  { href: '/musica', label: 'Música', hint: 'Sonido para concentrarte', icon: Music2 },
]

export default async function PerfilPage() {
  const [{ rewards, unlockedIds, points, isDemo, isDeveloper }, pet, daily] = await Promise.all([
    getRewardsData(),
    getPetData(),
    getDailyClaim(),
  ])

  // Rotación semanal de ropa de la mascota — determinista por número de semana.
  const clothing = pet.catalog.filter((i) => i.kind !== 'pet')
  const week = Math.floor(Date.now() / (7 * 86400000))
  const featured =
    clothing.length === 0
      ? []
      : Array.from({ length: Math.min(3, clothing.length) }, (_, k) => clothing[(week + k) % clothing.length])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        eyebrow="Tu espacio"
        title="Perfil y recompensas"
        description="Tu cuenta, tu nivel y lo que has ganado. Las recompensas son un extra: lo importante sigue siendo avanzar."
        actions={isDeveloper ? <Badge tone="accent">Developer · ∞</Badge> : undefined}
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <ProfileSummary />
          <DailyClaim claimedToday={daily.claimedToday} amount={daily.amount} isDemo={daily.isDemo} />
        </div>

        <Card as="section">
          <CardHeader eyebrow="Extras" title="Tu colección" />
          <nav aria-label="Extras" className="p-2">
            {LINKS.map(({ href, label, hint, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-control px-2.5 py-2.5 transition-colors hover:bg-sunken"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-line bg-raised text-ink-dim group-hover:text-ink">
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{label}</span>
                  <span className="block truncate text-xs text-ink-faint">{hint}</span>
                </span>
                <ChevronRight size={16} className="text-ink-faint transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </nav>
        </Card>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <WeeklyDrops
          featured={featured}
          ownedIds={pet.ownedIds}
          points={pet.points}
          isDeveloper={pet.isDeveloper}
          isDemo={pet.isDemo}
        />

        <RewardsStore
          rewards={rewards}
          unlockedIds={unlockedIds}
          points={points}
          isDeveloper={isDeveloper}
          isDemo={isDemo}
        />

        {isDeveloper && <DevPanel />}

        <Card as="section" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[15px] font-semibold text-ink">Cuenta</p>
            <p className="mt-0.5 text-sm text-ink-dim">Nombre, tema, enfoque, notificaciones y datos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/ajustes"
              className="inline-flex h-9 items-center gap-2 rounded-control border border-line bg-raised px-3.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface"
            >
              <Settings size={15} /> Ajustes
            </Link>
            <LogoutButton />
          </div>
        </Card>
      </div>
    </div>
  )
}
