'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, Target, TrendingUp, User } from 'lucide-react'
import clsx from 'clsx'

/**
 * Navegación principal de La Fragua: exactamente 4 ítems.
 * Hoy · Misiones · Progreso · Perfil.
 *
 * Se renderiza como barra superior en escritorio y como tab-bar inferior
 * en móvil (ver clases responsivas en el layout). El estado activo se
 * resuelve con `usePathname` para no depender de props.
 */
const ITEMS = [
  { href: '/hoy', label: 'Hoy', icon: Flame },
  { href: '/misiones', label: 'Misiones', icon: Target },
  { href: '/progreso', label: 'Progreso', icon: TrendingUp },
  { href: '/perfil', label: 'Perfil', icon: User },
] as const

export function ForgeNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'flex flex-1 flex-col items-center gap-1 rounded-forge px-3 py-2 text-xs font-medium transition-colors sm:flex-none sm:flex-row sm:gap-2 sm:text-sm',
              active
                ? 'bg-forge-raised text-forge-ink'
                : 'text-forge-ink-dim hover:text-forge-ink',
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
