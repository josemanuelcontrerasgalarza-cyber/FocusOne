'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Target, Lightbulb, BarChart2,
  Settings, Zap, Music,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { AuthGuard, ConfigNotice } from './AuthGuard'
import { DemoBanner } from './DemoBanner'

const nav = [
  { href: '/app',      icon: LayoutDashboard, label: 'Centro de mando' },
  { href: '/focus',    icon: Zap,             label: 'Deep Work' },
  { href: '/projects', icon: Target,           label: 'Misiones' },
  { href: '/ideas',    icon: Lightbulb,        label: 'Ideas' },
  { href: '/stats',    icon: BarChart2,        label: 'Telemetría' },
  { href: '/music',    icon: Music,            label: 'Música' },
  { href: '/settings', icon: Settings,         label: 'Sistemas' },
]

function NavItem({ href, icon: Icon, label, compact }: {
  href: string; icon: React.ElementType<{ size?: number; strokeWidth?: number }>; label: string; compact?: boolean
}) {
  const pathname = usePathname()
  const active = href === '/app' ? pathname === '/app' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
        compact ? 'flex-1 flex-col gap-0.5 px-1 py-2.5 text-[9px]' : 'gap-3',
        active
          ? 'nav-active'
          : 'text-ink-ghost hover:bg-white/[0.05] hover:text-ink-dim',
      )}
    >
      <Icon size={compact ? 18 : 16} strokeWidth={active ? 2.2 : 1.8} />
      <span className={compact ? 'leading-none font-medium' : 'font-medium'}>
        {compact ? label.split(' ')[0] : label}
      </span>
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const isDemo = useAuthStore((s) => s.isDemo)
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <AuthGuard>
      <ConfigNotice />
      <DemoBanner />
      <div className="flex min-h-screen">

        {/* Sidebar — desktop */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 p-3 lg:flex lg:flex-col">
          <div className="glass-panel flex h-full flex-col p-4">

            {/* Logo */}
            <Link href="/app" className="mb-6 flex items-center gap-3 px-2 py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-core to-plasma shadow-glow-core">
                <span className="h-3 w-3 rounded-full bg-void/60" />
              </div>
              <span className="font-display text-base font-semibold tracking-wide">
                Focus<span className="text-gradient">One</span>
              </span>
            </Link>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5">
              {nav.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </nav>

            {/* Usuario */}
            <div className="mt-auto">
              <div className="divider mb-3" />
              <div className="flex items-center gap-3 px-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-core/60 to-plasma/60 font-display text-xs font-semibold text-void">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink-dim">{user?.name}</p>
                  <p className="font-data text-[9px] uppercase tracking-[0.18em] text-ink-ghost">
                    Horizon v2.0
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Contenido principal — deja espacio arriba para el banner demo fijo */}
        <main
          className={cn(
            'flex-1 px-4 pb-28 lg:ml-60 lg:px-8 lg:pb-8',
            isDemo ? 'pt-16 lg:pt-16' : 'pt-5',
          )}
        >
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>

        {/* Bottom nav — móvil */}
        <nav className="fixed inset-x-2 bottom-2 z-30 lg:hidden">
          <div className="glass-panel flex items-center justify-around px-1 py-1">
            {nav.map((item) => (
              <NavItem key={item.href} {...item} compact />
            ))}
          </div>
        </nav>
      </div>
    </AuthGuard>
  )
}
