import type { Metadata } from 'next'
import { ForgeNav } from '@/components/forge/ForgeNav'
import { StreakBadge } from '@/components/forge/StreakBadge'

export const metadata: Metadata = {
  title: 'La Fragua',
}

/**
 * Shell de la experiencia "La Fragua".
 *
 * - Cubre el fondo cósmico del layout raíz con un canvas casi negro opaco
 *   (`bg-forge-canvas`, z sobre el <CosmosRoot/> global).
 * - Header fijo: logotipo + racha.
 * - Nav de 4 ítems: barra superior en escritorio, tab-bar inferior en móvil.
 *
 * Una sola misión protagonista por pantalla → el contenido va centrado y
 * con ancho máximo contenido.
 */
export default function FraguaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col bg-forge-canvas font-forge text-forge-ink">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-forge-line bg-forge-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <span className="font-forge text-lg font-extrabold tracking-tight">
            Focus<span className="text-ember">One</span>
          </span>

          {/* Nav superior — solo escritorio */}
          <div className="hidden sm:block">
            <ForgeNav />
          </div>

          <StreakBadge />
        </div>
      </header>

      {/* Contenido: una misión protagonista, centrada y contenida */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-6 sm:pb-10">
        {children}
      </main>

      {/* Tab-bar inferior — solo móvil */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-forge-line bg-forge-canvas/95 px-2 py-1.5 backdrop-blur-md sm:hidden">
        <div className="mx-auto max-w-2xl">
          <ForgeNav />
        </div>
      </div>
    </div>
  )
}
