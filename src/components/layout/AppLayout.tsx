import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Target, Lightbulb, BarChart2, Settings, Music } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MusicWidget } from '../features/music/MusicWidget'
import { cn } from '../../lib/utils'

interface AppLayoutProps {
  children: ReactNode
}

const mobileNav = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', exact: true },
  { to: '/projects', icon: Target, label: 'Proyecto' },
  { to: '/ideas', icon: Lightbulb, label: 'Ideas' },
  { to: '/stats', icon: BarChart2, label: 'Stats' },
  { to: '/music', icon: Music, label: 'Música' },
  { to: '/settings', icon: Settings, label: 'Config' },
]

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Proyectos',
  '/ideas': 'Ideas',
  '/stats': 'Estadísticas',
  '/settings': 'Configuración',
  '/music': 'Música',
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'FocusOne'
  const [widgetOpen, setWidgetOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar onOpenMusic={() => setWidgetOpen(true)} />

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <Header title={title} onOpenMusic={() => setWidgetOpen(true)} />

        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>

        {/* Bottom nav mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border z-30">
          <div className="flex items-center">
            {mobileNav.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors duration-150',
                    isActive ? 'text-primary-light' : 'text-text-muted',
                  )
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      {/* Widget flotante de música */}
      {widgetOpen && <MusicWidget onClose={() => setWidgetOpen(false)} />}

      {/* Botón flotante para abrir widget (cuando está cerrado) */}
      {!widgetOpen && (
        <button
          onClick={() => setWidgetOpen(true)}
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 w-12 h-12 rounded-full bg-primary hover:bg-primary-dark text-white shadow-lg flex items-center justify-center transition-all duration-150 hover:scale-110"
          title="Abrir música"
        >
          <Music size={20} />
        </button>
      )}
    </div>
  )
}
