'use client'

import { LogOut } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'
import { useAuthStore } from '@/store/authStore'

function Settings() {
  const { user, signOut } = useAuthStore()

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
            <p className="truncate text-sm text-ink-dim">{user?.email}</p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6" delay={0.05}>
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
