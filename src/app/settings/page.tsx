'use client'

import { useState } from 'react'
import { LogOut, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/lib/toast'

function UpgradeCard() {
  const { upgradeAccount, loading } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('La contraseña necesita al menos 8 caracteres')
      return
    }
    try {
      await upgradeAccount(email, password, name)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la cuenta')
    }
  }

  return (
    <GlassPanel className="p-6" delay={0.05}>
      <div className="flex items-center gap-2 text-solar">
        <Sparkles size={16} />
        <p className="font-data text-[11px] uppercase tracking-[0.25em]">Modo demo activo</p>
      </div>
      <h2 className="mt-2 font-display text-lg font-semibold">Guarda tu cuenta</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Estás usando una cuenta temporal. Crea tus credenciales para conservar tus misiones,
        objetivos y racha. <span className="text-ink">No perderás nada</span> de lo que ya hiciste.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          required
          placeholder="Tu nombre"
          className="glass-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          required
          placeholder="correo@ejemplo.com"
          className="glass-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Contraseña (mín. 8 caracteres)"
          className="glass-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" variant="plasma" loading={loading} fullWidth>
          Guardar mi cuenta
        </Button>
      </form>
    </GlassPanel>
  )
}

function Settings() {
  const { user, isDemo, signOut } = useAuthStore()

  return (
    <div className="flex flex-col gap-5">
      <header className="mt-2">
        <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">Sistemas</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Configuración</h1>
      </header>

      <GlassPanel className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-core to-plasma font-display text-xl font-semibold text-void">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{user?.name}</p>
            <p className="truncate text-sm text-ink-dim">
              {isDemo ? 'Cuenta temporal (demo)' : user?.email}
            </p>
          </div>
        </div>
      </GlassPanel>

      {isDemo && <UpgradeCard />}

      <GlassPanel className="p-6" delay={0.1}>
        <p className="font-data text-[11px] uppercase tracking-[0.25em] text-ink-ghost">
          Próximamente
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-dim">
          <li>◉ Kratos AI — tu copiloto de productividad (Groq + Llama)</li>
          <li>◉ FocusOne Pulse — feedback físico con ESP32</li>
          <li>◉ Coach de foco en tiempo real</li>
          <li>◉ Informe ejecutivo semanal</li>
        </ul>
      </GlassPanel>

      <div>
        <Button variant="danger" onClick={signOut}>
          <LogOut size={15} /> Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AppShell>
      <Settings />
    </AppShell>
  )
}
