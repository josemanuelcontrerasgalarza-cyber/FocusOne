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
  X,
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
import { Avatar, Kbd, Skeleton, EmptyState, Segmented } from '@/components/ui/primitives'
import { ConfirmHost, Menu, Modal } from '@/components/ui/Overlay'
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
import { FocusMiniTimer } from '@/components/focus/FocusMiniTimer'
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
  const { setPalette, openCapture } = useUI()
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-canvas/85 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:px-5">
      <Link href="/inicio" className="flex items-center gap-2.5 lg:hidden" aria-label="Inicio">
        <KairoMark className="h-6 w-6 shrink-0 text-ink" />
        <span className="truncate text-[16px] font-semibold tracking-[-0.015em] text-ink">{titleFor(pathname)}</span>
      </Link>

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
        <FocusMiniTimer />
        <ActivityPanel />
        <span className="hidden sm:inline-flex">
          <ThemeButton />
        </span>
        <UserMenu />
      </div>
    </header>
  )
}

/* ───────────────────────────── móvil ───────────────────────────── */

const BAR_ROUTES = ['/inicio', '/tareas', '/enfoque']

function MobileBar() {
  const pathname = usePathname()
  const { openCapture, mobileNavOpen, setMobileNav } = useUI()
  const moreActive = !BAR_ROUTES.some((r) => isActive(pathname, r))
  const tab = (it: { href: string; label: string; icon: typeof Home }) => {
    const active = isActive(pathname, it.href)
    const Icon = it.icon
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          'relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
          active ? 'text-ink' : 'text-ink-faint active:text-ink-dim',
        )}
      >
        {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent-fg" aria-hidden />}
        <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
        {it.label}
      </Link>
    )
  }
  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-canvas/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {tab({ href: '/inicio', label: 'Inicio', icon: Home })}
      {tab({ href: '/tareas', label: 'Tareas', icon: CheckSquare })}
      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={() => openCapture()}
          aria-label="Nueva tarea"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-ink shadow-pop transition-transform active:scale-95"
        >
          <Plus size={24} strokeWidth={2.4} />
        </button>
      </div>
      {tab({ href: '/enfoque', label: 'Enfoque', icon: Timer })}
      <button
        type="button"
        onClick={() => setMobileNav(true)}
        aria-haspopup="dialog"
        aria-expanded={mobileNavOpen}
        className={clsx(
          'relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
          moreActive ? 'text-ink' : 'text-ink-faint',
        )}
      >
        {moreActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent-fg" aria-hidden />}
        <MoreHorizontal size={21} />
        Más
      </button>
    </nav>
  )
}

/** Hoja inferior de «Más»: todo lo que no cabe en la barra, al alcance del pulgar. */
function MoreSheet() {
  const pathname = usePathname()
  const { mobileNavOpen, setMobileNav } = useUI()
  const { mode } = useTheme()
  const updateSettings = useWorkspace((s) => s.updateSettings)
  const items = [...NAV_MAIN.filter((n) => !BAR_ROUTES.includes(n.href)), ...NAV_SPACE, NAV_SETTINGS]
  return (
    <Modal open={mobileNavOpen} onClose={() => setMobileNav(false)} title="Más">
      <nav aria-label="Más secciones" className="grid grid-cols-3 gap-2">
        {items.map((n) => {
          const active = isActive(pathname, n.href)
          const Icon = n.icon
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMobileNav(false)}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-control border px-1 text-center text-[12.5px] font-medium transition-colors active:scale-[0.98]',
                active ? 'border-accent-fg/40 bg-accent/15 text-ink' : 'border-line bg-surface text-ink-dim active:bg-sunken',
              )}
            >
              <Icon size={20} strokeWidth={1.9} className={active ? 'text-ink' : 'text-ink-dim'} />
              {n.label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-[13px] font-medium text-ink">Tema</span>
        <Segmented
          label="Tema"
          size="sm"
          value={mode}
          onChange={(v) => updateSettings({ theme: v })}
          options={[
            { value: 'light', label: 'Claro', icon: <Sun size={13} /> },
            { value: 'dark', label: 'Oscuro', icon: <Moon size={13} /> },
            { value: 'system', label: 'Auto', icon: <Monitor size={13} /> },
          ]}
        />
      </div>
      <div className="mt-3 pb-[env(safe-area-inset-bottom)]">
        <LevelCard />
      </div>
    </Modal>
  )
}

/** Aviso de modo local: una línea en móvil y se puede ocultar durante la sesión. */
function LocalBanner() {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem('kairo:local-banner') === 'off')
    } catch {}
  }, [])
  if (hidden) return null
  return (
    <div className="flex items-center gap-2 border-b border-line bg-sunken py-1.5 pl-4 pr-1.5 text-xs text-ink-dim sm:justify-center">
      <HardDrive size={13} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate sm:flex-none">
        <span className="sm:hidden">Modo local: tus datos solo están en este navegador.</span>
        <span className="hidden sm:inline">Modo local: el servidor no está configurado, así que tus datos se guardan solo en este navegador.</span>
      </span>
      <button
        type="button"
        aria-label="Ocultar aviso"
        onClick={() => {
          setHidden(true)
          try {
            sessionStorage.setItem('kairo:local-banner', 'off')
          } catch {}
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-raised hover:text-ink"
      >
        <X size={13} />
      </button>
    </div>
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
      {mode === 'local' && <LocalBanner />}
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
  const { sidebarCollapsed, setMobileNav } = useUI()
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

      <MoreSheet />

      <CommandPalette />
      <QuickCaptureHost />
      <TaskDrawerHost />
      <ShortcutsHelp />
      <ConfirmHost />
    </div>
  )
}
