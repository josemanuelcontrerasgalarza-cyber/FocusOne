import type { Metadata } from 'next'
import { getDashboardData } from '@/lib/missions'
import { getDailyClaim } from '@/lib/daily'
import { MissionConsole } from './_components/MissionConsole'
import { DailyClaim } from './_components/DailyClaim'

export const metadata: Metadata = { title: 'Hoy' }

// La misión activa y las stats se leen por request (datos del usuario).
export const dynamic = 'force-dynamic'

/**
 * Dashboard "Hoy". Server Component: lee la misión activa + stats + estado de
 * la recompensa diaria y los pasa a los componentes interactivos.
 */
export default async function HoyPage() {
  const [{ mission, stats, upcoming, isDemo }, daily] = await Promise.all([
    getDashboardData(),
    getDailyClaim(),
  ])

  return (
    <>
      <DailyClaim
        claimedToday={daily.claimedToday}
        amount={daily.amount}
        isDemo={daily.isDemo}
      />
      <MissionConsole
        mission={mission}
        stats={stats}
        upcoming={upcoming}
        isDemo={isDemo}
      />
    </>
  )
}
