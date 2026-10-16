'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import clsx from 'clsx'
import {
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Menu as MenuIcon,
  Sun,
  Moon,
  Monitor,
  LogOut,
  User,
  Settings,
  Keyboard,
  Home,
  CheckSquare,
  Timer,
  MoreHorizontal,
  RefreshCw,
  HardDrive,
} from 'lucide-react'
import { KairoLogo, KairoMark } from '@/components/brand/Logo'
import { Button, IconButton } from '@/components/ui/Button'
import { Avatar, Kbd, Skeleton, EmptyState } from '@/components/ui/primitives'
import { Drawer, ConfirmHost, Menu } from '@/components/ui/Overlay'
import { useAuthStore } from '@/store/authStore'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { useTheme } from '@/store/themeStore'
import { supabaseConfigured } from '@/lib/supabase'
import { computeXP, levelFromXP } from '@/lib/kairo/xp'
import { NAV_MAIN, NAV_SPACE, NAV_SETTINGS, isActive, titleFor, type NavItem } from './nav'
import { CommandPalette } from './CommandPalette'
import { ShortcutsHelp, useGlobalShortcuts } from './Shortcuts'
import { ActivityPanel } from './ActivityPanel'
import { QuickCaptureHost } from '@/components/tasks/QuickCapture'
import { TaskDrawerHost } from '@/components/tasks/TaskDrawer'

/* ───────────────────────────── navegación ───────────────────────────── */

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = isActive(pathname, item.href)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'group flex h-9 items-center gap-3 rounded-control text-[14px] transition-colors',
        collapsed ? 'justify-center px-0' : 'px-2.5',
        active ? 'bg-raised font-medium text-ink shadow-card dark:bg-raised' : 'text-ink-dim hover:bg-sunken hover:text-ink',
      )}
    >
      <Icon size={17} className={active ? 'text-ink' : 'text-ink-faint group-hover:text-ink-dim'} strokeWidth={active ? 2.2 : 1.9} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-fg" />}
    </Link>
  )
}

function LevelCard({ collapsed }: { collapsed?: boolean }) {
  const totals = useWorkspace((s) => s.totals)
  if (!totals) return null
  const lv = levelFromXP(computeXP(totals))
  if (collapsed) {
    return (
      <Link href="/objetivos" title={`Nivel ${lv.level} · ${lv.title}`} className="mx-auto flex h-9 w-9 items-center justify-center rounded-control font-mono text-xs font-semibold text-ink-dim hover:bg-sunken">
        {lv.level}
      </Link>
    )
  }
  return (
    <Link href="/objetivos" className="block rounded-control px-2.5 py-2 transition-colors hover:bg-sunken">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink">Nivel {lv.level}</span>
        <span className="text-ink-faint">{lv.title}</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-accent-fg transition-[width] duration-700" style={{ width: `${Math.round(lv.progress * 100)}%` }} />
      </div>
      <p className="mt-1 font-mono text-[10px] text-ink-faint">
        {lv.into} / {lv.span} XP
      </p>
    </Link>
  )
}

function SidebarContent({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Principal" className="flex flex-col gap-0.5">
        {NAV_MAIN.map((n) => (
          <NavLink key={n.href} item={n} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className={clsx('my-4 h-px bg-line', collapsed ? 'mx-2' : 'mx-1')} />
      {!collapsed && <p className="k-eyebrow mb-1.5 px-2.5">Tu espacio</p>}
      <nav aria-label="Tu espacio" className="flex flex-col gap-0.5">
        {NAV_SPACE.map((n) => (
          <NavLink key={n.href} item={n} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 pt-4">
        <LevelCard collapsed={collapsed} />
        <NavLink item={NAV_SETTINGS} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

function Sidebar() {
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUI()
  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface px-3 pb-3 pt-4 transition-[width] duration-200 ease-out lg:flex',
        collapsed ? 'w-[68px]' : 'w-[244px]',
      )}
    >
      <div className={clsx('mb-5 flex items-center', collapsed ? 'justify-center' : 'justify-between px-1.5')}>
        <Link href="/inicio" aria-label="Kairo — Inicio">
          {collapsed ? <KairoMark className="h-6 w-6 text-ink" /> : <KairoLogo />}
        </Link>
        {!collapsed && (
          <IconButton label="Contraer barra lateral ([)" size="sm" onClick={toggleSidebar}>
            <PanelLeftClose size={16} />
          </IconButton>
        )}
      </div>
      {collapsed && (
        <IconButton label="Expandir barra lateral ([)" size="sm" onClick={toggleSidebar} className="mx-auto mb-3">
          <PanelLeftOpen size={16} />
        </IconButton>
      )}
      <SidebarContent collapsed={collapsed} />
    </aside>
  )
}

/* ───────────────────────────── barra superior ───────────────────────────── */

function ThemeButton() {
  const { mode } = useTheme()
  const updateSettings = useWorkspace((s) => s.updateSettings)
  const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light'
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor
  const label = { light: 'Tema claro', dark: 'Tema oscuro', system: 'Tema del sistema' }[mode]
  return (
    <IconButton label={`${label} — cambiar`} onClick={() => updateSettings({ theme: next })}>
      <Icon size={17} />
    </IconButton>
  )
}

function UserMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const profile = useWorkspace((s) => s.profile)
  const mode = useWorkspace((s) => s.mode)
  const clear = useWorkspace((s) => s.clear)
  const { session, signOut } = useAuthStore()
  const setShortcuts = useUI((s) => s.setShortcuts)
  const name = profile?.name || profile?.email?.split('@')[0] || (mode === 'local' ? 'Tú' : 'Cuenta')
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-label="Menú de usuario"
        className="flex items-center rounded-full ring-offset-2 ring-offset-canvas focus-visible:ring-2"
      >
        <Avatar name={name} size={32} />
      </button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        className="w-56"
        items={[
          { label: 'Perfil y recompensas', icon: <User size={14} />, onSelect: () => router.push('/perfil') },
          { label: 'Ajustes', icon: <Settings size={14} />, onSelect: () => router.push('/ajustes') },
          { label: 'Atajos de teclado', icon: <Keyboard size={14} />, shortcut: '?', onSelect: () => setShortcuts(true) },
          ...(session
            ? [
                {
                  label: 'Cerrar sesión',
                  icon: <LogOut size={14} />,
                  danger: true,
                  onSelect: async () => {
                    await signOut()
                    clear()
                    router.replace('/login')
                  },
                },
              ]
            : []),
        ]}
      />
    </div>
  )
}

function Topbar() {
  const pathname = usePathname()
  const { setPalette, openCapture, setMobileNav } = useUI()
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-canvas/85 px-3 backdrop-blur-md sm:px-5">
      <IconButton label="Abrir menú" className="lg:hidden" onClick={() => setMobileNav(true)}>
        <MenuIcon size={18} />
      </IconButton>
      <Link href="/inicio" className="mr-1 lg:hidden" aria-label="Inicio">
        <KairoMark className="h-6 w-6 text-ink" />
      </Link>
      <p className="hidden truncate text-[15px] font-semibold tracking-[-0.01em] text-ink sm:block lg:hidden">{titleFor(pathname)}</p>

      <button
        type="button"
        onClick={() => setPalette(true)}
        className="ml-auto flex h-9 min-w-0 items-center gap-2 rounded-control border border-line bg-surface px-2.5 text-sm text-ink-faint transition-colors hover:border-line-strong hover:text-ink-dim sm:w-72 lg:ml-0"
        aria-label="Buscar o ejecutar un comando (⌘K)"
      >
        <Search size={15} />
        <span className="hidden flex-1 truncate text-left sm:block">Buscar o ejecutar…</span>
        <span className="hidden gap-0.5 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="flex items-center gap-1 lg:ml-auto">
        <Button variant="primary" size="sm" icon={<Plus size={15} strokeWidth={2.4} />} onClick={() => openCapture()} className="hidden sm:inline-flex">
          Nueva tarea
        </Button>
        <ActivityPanel />
        <ThemeButton />
        <UserMenu />
      </div>
    </header>
  )
}

/* ───────────────────────────── móvil ───────────────────────────── */

function MobileBar() {
  const pathname = usePathname()
  const { openCapture, setMobileNav } = useUI()
  const items = [
    { href: '/inicio', label: 'Inicio', icon: Home },
    { href: '/tareas', label: 'Tareas', icon: CheckSquare },
  ]
  const items2 = [{ href: '/enfoque', label: 'Enfoque', icon: Timer }]
  const tab = (it: { href: string; label: string; icon: typeof Home }) => {
    const active = isActive(pathname, it.href)
    const Icon = it.icon
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? 'page' : undefined}
        className={clsx('flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]', active ? 'text-ink' : 'text-ink-faint')}
      >
        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
        {it.label}
      </Link>
    )
  }
  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center border-t border-line bg-canvas/95 px-2 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 backdrop-blur-md lg:hidden"
    >
      {items.map(tab)}
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={() => openCapture()}
          aria-label="Nueva tarea"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-ink shadow-pop active:scale-95"
        >
          <Plus size={22} strokeWidth={2.4} />
        </button>
      </div>
      {items2.map(tab)}
      <button
        type="button"
        onClick={() => setMobileNav(true)}
        className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] text-ink-faint"
      >
        <MoreHorizontal size={20} />
        Más
      </button>
    </nav>
  )
}

/* ───────────────────────────── estados de datos ───────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-8" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

function WorkspaceGate({ children }: { children: ReactNode }) {
  const { status, error, load, mode } = useWorkspace()
  if (status === 'error') {
    return (
      <EmptyState
        className="mt-16"
        icon={<RefreshCw size={18} />}
        title="No pudimos cargar tu espacio"
        description={error ?? undefined}
        action={
          <Button variant="primary" onClick={() => load()}>
            Reintentar
          </Button>
        }
      />
    )
  }
  if (status !== 'ready') return <LoadingSkeleton />
  return (
    <>
      {mode === 'local' && (
        <div className="flex items-center justify-center gap-2 border-b border-line bg-sunken px-4 py-1.5 text-center text-xs text-ink-dim">
          <HardDrive size={13} />
          Modo local: el servidor no está configurado, así que tus datos se guardan solo en este navegador.
        </div>
      )}
      {children}
    </>
  )
}

/* ───────────────────────────── shell ───────────────────────────── */

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { session, initialized } = useAuthStore()
  const { status, userId, load, clear } = useWorkspace()
  const { sidebarCollapsed, mobileNavOpen, setMobileNav } = useUI()
  const immersive = pathname.startsWith('/enfoque')

  useGlobalShortcuts()

  useEffect(() => {
    const off = useTheme.getState().init()
    useUI.getState().initSidebar()
    return off
  }, [])

  // Carga de datos según el modo: nube (con sesión) o local (sin backend).
  useEffect(() => {
    if (!supabaseConfigured) {
      if (status === 'idle') void load()
      return
    }
    if (!initialized) return
    if (!session) {
      clear()
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    if (status === 'idle' || (userId && userId !== session.user.id)) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, session?.user.id])

  useEffect(() => setMobileNav(false), [pathname, setMobileNav])

  return (
    <div className="min-h-screen bg-canvas">
      {!immersive && <Sidebar />}
      <div className={clsx(!immersive && (sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[244px]'), 'transition-[padding] duration-200')}>
        {!immersive && <Topbar />}
        <main id="contenido" className={clsx(!immersive && 'pb-24 lg:pb-10')}>
          <WorkspaceGate>{children}</WorkspaceGate>
        </main>
      </div>
      {!immersive && <MobileBar />}

      <Drawer open={mobileNavOpen} onClose={() => setMobileNav(false)} label="Navegación" side="left" width="max-w-[280px]">
        <div className="flex h-full flex-col px-3 pb-4 pt-4">
          <div className="mb-5 px-1.5">
            <KairoLogo />
          </div>
          <SidebarContent onNavigate={() => setMobileNav(false)} />
        </div>
      </Drawer>

      <CommandPalette />
      <QuickCaptureHost />
      <TaskDrawerHost />
      <ShortcutsHelp />
      <ConfirmHost />
    </div>
  )
}
