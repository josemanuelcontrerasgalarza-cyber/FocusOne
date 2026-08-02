import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgeNav } from '@/components/forge/ForgeNav'
import { StreakBadge } from '@/components/forge/StreakBadge'
import { PointsBadge } from '@/components/forge/PointsBadge'
import { ForgeCommand } from '@/components/forge/ForgeCommand'
import { CommandButton } from '@/components/forge/CommandButton'
import { getHeaderStats } from '@/lib/missions'

export const metadata: Metadata = {
  title: 'La Fragua',
}

// Las insignias del header (puntos/racha) son datos por-usuario: nunca cachear.
export const dynamic = 'force-dynamic'

/**
 * Shell de la experiencia "La Fragua" (diseño FocusOne Dashboard).
 *
 * - Cubre el fondo cósmico del layout raíz con un canvas casi negro opaco.
 * - Header full-width: logotipo + nav + puntos + racha + ⌘K + avatar.
 * - Paleta de comandos global (⌘K). En móvil el nav baja a una tab-bar.
 */
export default async function FraguaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { streak, points } = await getHeaderStats()

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

        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <CommandButton />
          <div className="hidden sm:block">
            <PointsBadge points={points} />
          </div>
          <StreakBadge days={streak} />
          <Link
            href="/perfil"
            aria-label="Perfil"
            className="h-9 w-9 rounded-full border border-forge-line bg-forge-raised transition-colors hover:border-forge-ink-faint"
          />
        </div>
      </header>

      {/* Contenido a todo el ancho */}
      <main className="flex flex-1 flex-col pb-16 sm:pb-0">{children}</main>

      {/* Tab-bar inferior — solo móvil */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-forge-line bg-forge-canvas/95 px-2 py-1.5 backdrop-blur-md sm:hidden">
        <ForgeNav variant="bottom" />
      </div>

      {/* Paleta de comandos global (⌘K) */}
      <ForgeCommand />
    </div>
  )
}
