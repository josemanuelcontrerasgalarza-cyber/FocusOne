import type { Metadata } from 'next'
import { getDashboardData } from '@/lib/missions'
import { MissionConsole } from './_components/MissionConsole'

export const metadata: Metadata = { title: 'Hoy' }

// La misión activa y las stats se leen por request (datos del usuario).
export const dynamic = 'force-dynamic'

/**
 * Dashboard "Hoy" — implementación del diseño `FocusOne Dashboard.dc.html`.
 * Server Component: lee la misión activa + stats del usuario y las pasa al
 * componente interactivo (timer real, barra de calor, drenaje a racha).
 */
export default async function HoyPage() {
  const { mission, stats, upcoming, isDemo } = await getDashboardData()

  return (
    <MissionConsole
      mission={mission}
      stats={stats}
      upcoming={upcoming}
      isDemo={isDemo}
    />
  )
}
