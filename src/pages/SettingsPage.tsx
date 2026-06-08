import { useNavigate } from 'react-router-dom'
import { LogOut, User, Mail } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { getInitials } from '../lib/utils'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Configuración</h1>
        <p className="text-sm text-text-muted mt-0.5">Gestiona tu cuenta</p>
      </div>

      {/* Perfil */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-text-hint uppercase tracking-wide mb-4">Perfil</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-white">
            {user ? getInitials(user.name) : '?'}
          </div>
          <div>
            <p className="font-semibold text-text-primary">{user?.name}</p>
            <p className="text-sm text-text-muted">{user?.email}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-elevated border border-border">
            <User size={16} className="text-text-muted" />
            <div>
              <p className="text-xs text-text-hint">Nombre</p>
              <p className="text-sm text-text-primary">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-elevated border border-border">
            <Mail size={16} className="text-text-muted" />
            <div>
              <p className="text-xs text-text-hint">Correo</p>
              <p className="text-sm text-text-primary">{user?.email}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Logros */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-text-hint uppercase tracking-wide mb-4">Logros</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-bg-elevated border border-border">
            <p className="text-2xl font-bold text-warning">{user?.streak_best ?? 0}</p>
            <p className="text-xs text-text-muted mt-0.5">Mejor racha</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-bg-elevated border border-border">
            <p className="text-2xl font-bold text-success">{user?.tasks_completed_total ?? 0}</p>
            <p className="text-xs text-text-muted mt-0.5">Tareas completadas</p>
          </div>
        </div>
      </Card>

      {/* Sesión */}
      <Card padding="lg" className="border-danger/20">
        <h2 className="text-sm font-semibold text-text-hint uppercase tracking-wide mb-4">Sesión</h2>
        <Button
          variant="danger"
          leftIcon={<LogOut size={16} />}
          onClick={handleSignOut}
        >
          Cerrar sesión
        </Button>
      </Card>

      <p className="text-center text-xs text-text-hint">
        FocusOne by Kratos Labs — Termina lo que empiezas.
      </p>
    </div>
  )
}
