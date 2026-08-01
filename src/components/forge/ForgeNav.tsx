'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, Target, TrendingUp, User } from 'lucide-react'
import clsx from 'clsx'

/**
 * Navegación principal de La Fragua: exactamente 4 ítems.
 * Hoy · Misiones · Progreso · Perfil.
 *
 * - variant="top": barra de escritorio, texto con subrayado ember en el
 *   activo (como el diseño FocusOne Dashboard).
 * - variant="bottom": tab-bar de móvil, icono + etiqueta.
 *
 * El estado activo se resuelve con `usePathname` para no depender de props.
 */
const ITEMS = [
  { href: '/hoy', label: 'Hoy', icon: Flame },
  { href: '/misiones', label: 'Misiones', icon: Target },
  { href: '/progreso', label: 'Progreso', icon: TrendingUp },
  { href: '/perfil', label: 'Perfil', icon: User },
] as const

export function ForgeNav({ variant = 'top' }: { variant?: 'top' | 'bottom' }) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  if (variant === 'bottom') {
    return (
      <nav className="mx-auto flex max-w-md items-center justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex flex-1 flex-col items-center gap-1 rounded-forge px-2 py-2 text-[11px] font-medium transition-colors',
                active ? 'text-forge-ink' : 'text-forge-ink-dim',
              )}
            >
              <Icon
                size={18}
                className={active ? 'text-ember' : 'text-forge-ink-faint'}
                strokeWidth={active ? 2.4 : 2}
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    )
  }

  // variant="top"
  return (
    <nav className="flex items-center gap-7">
      {ITEMS.map(({ href, label }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'relative pb-1 text-sm transition-colors',
              active
                ? 'font-semibold text-forge-ink'
                : 'font-medium text-forge-ink-dim hover:text-forge-ink',
            )}
          >
            {label}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ember" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
