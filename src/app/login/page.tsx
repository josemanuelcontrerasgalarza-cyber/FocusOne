'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { GuestGuard, ConfigNotice } from '@/components/AuthGuard'
import { DemoButton } from '@/components/DemoButton'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'
import { toast } from '@/lib/toast'

export default function LoginPage() {
  const { signIn, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await signIn(email, password)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión')
    }
  }

  return (
    <GuestGuard>
      <ConfigNotice />
      <div className="flex min-h-screen items-center justify-center p-4">
        <GlassPanel className="w-full max-w-sm p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-gradient-to-br from-core to-plasma shadow-glow-core" />
            <h1 className="font-display text-2xl font-semibold">
              Focus<span className="text-gradient">One</span>
            </h1>
            <p className="mt-1 text-sm text-ink-dim">Termina lo que empiezas.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              placeholder="Contraseña"
              className="glass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" loading={loading} fullWidth size="lg" className="mt-2">
              Entrar al centro de mando
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-ink-ghost">
            <span className="h-px flex-1 bg-glass-border" />
            o
            <span className="h-px flex-1 bg-glass-border" />
          </div>

          <DemoButton className="w-full" />

          <p className="mt-6 text-center text-sm text-ink-dim">
            ¿Sin cuenta?{' '}
            <Link href="/register" className="text-core hover:underline">
              Crear una
            </Link>
          </p>
        </GlassPanel>
      </div>
    </GuestGuard>
  )
}
