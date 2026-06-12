'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Target,
  Lightbulb,
  BarChart2,
  Settings,
  Zap,
  Music,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { AuthGuard, ConfigNotice } from './AuthGuard'

const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Centro de mando' },
  { href: '/focus', icon: Zap, label: 'Deep Work' },
  { href: '/projects', icon: Target, label: 'Misiones' },
  { href: '/ideas', icon: Lightbulb, label: 'Ideas' },
  { href: '/stats', icon: BarChart2, label: 'Telemetría' },
  { href: '/music', icon: Music, label: 'Música' },
  { href: '/settings', icon: Settings, label: 'Sistemas' },
]

function NavItems({ compact }: { compact?: boolean }) {
  const pathname = usePathname()
  return (
    <>
      {nav.map(({ href, icon: Icon, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
              compact && 'flex-1 flex-col gap-0.5 px-1 py-2 text-[10px]',
              active
                ? 'bg-core/10 text-core shadow-glow-core'
                : 'text-ink-dim hover:bg-white/5 hover:text-ink',
            )}
          >
            <Icon size={compact ? 18 : 17} />
            <span className={cn(compact && 'leading-none')}>{compact ? label.split(' ')[0] : label}</span>
          </Link>
        )
      })}
    </>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)

  return (
    <AuthGuard>
      <ConfigNotice />
      <div className="flex min-h-screen">
        {/* Sidebar de cristal — desktop */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 p-4 lg:block">
          <div className="glass-panel flex h-full flex-col p-4">
            <Link href="/" className="mb-8 flex items-center gap-3 px-2">
              <span className="h-8 w-8 rounded-full bg-gradient-to-br from-core to-plasma shadow-glow-core" />
              <span className="font-display text-lg font-semibold tracking-wide">
                Focus<span className="text-gradient">One</span>
              </span>
            </Link>
            <nav className="flex flex-col gap-1">
              <NavItems />
            </nav>
            <div className="mt-auto px-2">
              <p className="truncate text-xs text-ink-ghost">{user?.email}</p>
              <p className="mt-1 font-data text-[10px] uppercase tracking-[0.2em] text-ink-ghost">
                Horizon v2.0
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-4 pb-28 pt-6 lg:ml-60 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>

        {/* Bottom nav — mobile */}
        <nav className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
          <div className="glass-panel flex items-center px-2 py-1">
            <NavItems compact />
          </div>
        </nav>
      </div>
    </AuthGuard>
  )
}
