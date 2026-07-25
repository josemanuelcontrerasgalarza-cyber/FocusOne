import type { Metadata } from 'next'
import { ForgeNav } from '@/components/forge/ForgeNav'
import { StreakBadge } from '@/components/forge/StreakBadge'
import { getStreakDays } from '@/lib/missions'

export const metadata: Metadata = {
  title: 'La Fragua',
}

/**
 * Shell de la experiencia "La Fragua" (diseño FocusOne Dashboard).
 *
 * - Cubre el fondo cósmico del layout raíz con un canvas casi negro opaco.
 * - Header full-width: logotipo + nav (subrayado ember en el activo) + racha
 *   dorada + avatar. En móvil el nav baja a una tab-bar inferior.
 * - El contenido va a todo el ancho: cada pantalla decide su propio layout
 *   (el dashboard usa una rejilla de 2 columnas).
 */
export default async function FraguaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const streakDays = await getStreakDays()

  return (
    <div className="relative z-10 flex min-h-screen flex-col bg-forge-canvas font-forge text-forge-ink">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-forge-line bg-forge-canvas/90 px-6 py-5 backdrop-blur-md sm:px-12 sm:py-7">
        <div className="flex items-center gap-9">
          {/* Logotipo */}
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-ember" />
            <span className="font-forge text-base font-bold tracking-tight">
              FocusOne
            </span>
          </div>
          {/* Nav superior — solo escritorio */}
          <div className="hidden sm:block">
            <ForgeNav variant="top" />
          </div>
        </div>

        <div className="flex items-center gap-5">
          <StreakBadge days={streakDays} />
          {/* Avatar (placeholder — perfil real en Fase 6) */}
          <div className="h-9 w-9 rounded-full border border-forge-line bg-forge-raised" />
        </div>
      </header>

      {/* Contenido a todo el ancho */}
      <main className="flex flex-1 flex-col pb-16 sm:pb-0">{children}</main>

      {/* Tab-bar inferior — solo móvil */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-forge-line bg-forge-canvas/95 px-2 py-1.5 backdrop-blur-md sm:hidden">
        <ForgeNav variant="bottom" />
      </div>
    </div>
  )
}
