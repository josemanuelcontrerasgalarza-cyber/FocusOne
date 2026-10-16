import type { ReactNode } from 'react'
import Link from 'next/link'
import { KairoLogo } from '@/components/brand/Logo'
import { NextMovePreview } from '@/components/intro/Preview'
import { ThemeToggle } from '@/components/intro/ThemeToggle'

/**
 * Marco de las pantallas de acceso. Escritorio: panel editorial de marca a la
 * izquierda + formulario a la derecha. Móvil: solo el formulario.
 */
export function AuthShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Panel de marca */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex xl:p-14">
        <Link href="/" aria-label="Kairo — portada" className="w-fit rounded-control">
          <KairoLogo />
        </Link>

        <div className="max-w-md">
          <p className="k-eyebrow">De kairós · el momento oportuno</p>
          <p className="mt-4 font-display text-[60px] leading-[0.95] tracking-[-0.015em] text-ink xl:text-[72px]">
            Lo importante, <em className="italic">ahora.</em>
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-dim">
            Kairo te dice qué hacer a continuación, te ayuda a concentrarte y te muestra tu progreso real.
          </p>
          <div aria-hidden className="mt-10">
            <NextMovePreview className="shadow-pop" />
            <p className="mt-2.5 text-[11px] text-ink-faint">Vista ilustrativa</p>
          </div>
        </div>

        <p className="text-xs text-ink-faint">© {new Date().getFullYear()} Kratos Labs</p>
      </aside>

      {/* Formulario */}
      <main className="flex min-h-screen flex-col px-4 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Kairo — portada" className="rounded-control lg:invisible">
            <KairoLogo />
          </Link>
          <div className="flex items-center gap-1">
            {aside}
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-ink-faint lg:hidden">© {new Date().getFullYear()} Kratos Labs</p>
      </main>
    </div>
  )
}

/** Separador "o" entre el formulario y los accesos alternativos. */
export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-ink-faint" role="separator">
      <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
    </div>
  )
}
