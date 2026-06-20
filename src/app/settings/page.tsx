'use client'

import { useState } from 'react'
import { LogOut, Sparkles, Cpu, Zap, BarChart2, Lock, Keyboard, Database } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'
import { DataExport } from '@/components/DataExport'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
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

  const strength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length >= 4 ? 1 : 0

  return (
    <GlassPanel className="p-6 card-accent-solar" delay={0.05}>
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-solar" />
        <p className="font-data text-[11px] uppercase tracking-[0.25em] text-solar">Modo demo activo</p>
      </div>
      <h2 className="mt-2 font-display text-lg font-semibold">Guarda tu cuenta</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Cuenta temporal activa. Crea tus credenciales para conservar misiones, objetivos y racha.{' '}
        <span className="text-ink">No perderás nada</span> de lo que ya hiciste.
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
        <div>
          <input
            type="password"
            required
            placeholder="Contraseña (mín. 8 caracteres)"
            className="glass-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password.length > 0 && (
            <div className="mt-1.5 flex gap-1">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    strength >= level
                      ? level === 1 ? 'bg-nova' : level === 2 ? 'bg-solar' : 'bg-core'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <Button type="submit" variant="solid-plasma" loading={loading} fullWidth>
          Guardar mi cuenta
        </Button>
      </form>
    </GlassPanel>
  )
}

const ROADMAP = [
  { icon: Cpu,      label: 'Kratos AI',             desc: 'Copiloto de productividad (Groq + Llama)' },
  { icon: Zap,      label: 'FocusOne Pulse',         desc: 'Feedback físico con ESP32' },
  { icon: BarChart2, label: 'Coach en tiempo real',  desc: 'Análisis de sesiones de foco' },
  { icon: Lock,     label: 'Informe ejecutivo',       desc: 'Resumen semanal de rendimiento' },
]

function Settings() {
  const { user, isDemo, signOut } = useAuthStore()
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen)
  const initials = user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="flex flex-col gap-5">
      <header className="mt-2">
        <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">Sistemas</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Configuración</h1>
      </header>

      <GlassPanel className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-core to-plasma font-display text-xl font-semibold text-void shadow-glow-core">
            {initials}
            <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-void ${isDemo ? 'bg-solar' : 'bg-core'}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{user?.name}</p>
            <p className="truncate text-sm text-ink-dim">
              {isDemo ? 'Cuenta temporal (demo)' : user?.email}
            </p>
            <span className={`badge mt-1 inline-flex ${isDemo ? 'badge-solar' : 'badge-core'}`}>
              {isDemo ? 'Demo' : 'Activa'}
            </span>
          </div>
        </div>
      </GlassPanel>

      {isDemo && <UpgradeCard />}

      <GlassPanel className="p-6" delay={0.1}>
        <p className="mb-4 font-data text-[11px] uppercase tracking-[0.25em] text-ink-ghost">
          Próximamente
        </p>
        <div className="flex flex-col gap-3">
          {ROADMAP.map(({ icon: Icon, label, desc }, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-glass-border bg-black/15 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-plasma/10 text-[#c4b5fd]">
                <Icon size={15} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-dim">{label}</p>
                <p className="text-[11px] text-ink-ghost">{desc}</p>
              </div>
              <span className="badge badge-ghost ml-auto">Pronto</span>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Datos y herramientas */}
      <GlassPanel className="p-6" delay={0.15}>
        <p className="mb-4 font-data text-[11px] uppercase tracking-[0.25em] text-ink-ghost">
          Datos y herramientas
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-glass-border bg-black/15 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-core/10 text-core">
              <Database size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-dim">Exportar mis datos</p>
              <p className="text-[11px] text-ink-ghost">Descarga todo en formato JSON</p>
            </div>
            <DataExport />
          </div>
          <button
            onClick={() => setShortcutsOpen(true)}
            className="flex items-center gap-3 rounded-xl border border-glass-border bg-black/15 px-4 py-3 text-left transition-colors hover:border-glass-border-hi"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-plasma/10 text-[#c4b5fd]">
              <Keyboard size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-dim">Atajos de teclado</p>
              <p className="text-[11px] text-ink-ghost">Navega más rápido con ⌘K y más</p>
            </div>
            <span className="badge badge-ghost">Ver</span>
          </button>
        </div>
      </GlassPanel>

      <div className="flex items-center justify-between rounded-xl border border-glass-border bg-black/15 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-ink-dim">Cerrar sesión</p>
          <p className="text-[11px] text-ink-ghost">Salir del centro de mando</p>
        </div>
        <Button variant="danger" size="sm" onClick={signOut}>
          <LogOut size={14} /> Salir
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
