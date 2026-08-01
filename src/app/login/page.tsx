'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
      <div className="relative flex min-h-screen items-center justify-center p-4">
        {/* Fondo con glow sutil */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-core/5 blur-[120px]" />
          <div className="absolute left-2/3 top-2/3 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-plasma/5 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          className="relative w-full max-w-sm"
        >
          <GlassPanel className="p-8" tilt={false}>
            {/* Logo */}
            <div className="mb-8 text-center">
              <div className="relative mx-auto mb-5 h-16 w-16">
                {/* Anillo pulsante exterior */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-core to-plasma"
                />
                {/* Orbe central */}
                <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-core via-plasma to-core shadow-glow-core" />
              </div>

              <h1 className="font-display text-2xl font-semibold">
                Focus<span className="text-gradient">One</span>
              </h1>
              <p className="mt-1.5 text-sm text-ink-dim">Termina lo que empiezas.</p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-data text-[10px] uppercase tracking-wider text-ink-ghost">
                  Correo
                </label>
                <input
                  type="email"
                  required
                  placeholder="correo@ejemplo.com"
                  className="glass-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-data text-[10px] uppercase tracking-wider text-ink-ghost">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="glass-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" loading={loading} fullWidth size="lg" className="mt-3">
                Entrar al centro de mando
              </Button>
            </form>

            {/* Separador */}
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-glass-border" />
              <span className="font-data text-[11px] uppercase tracking-[0.2em] text-ink-ghost">
                o
              </span>
              <span className="h-px flex-1 bg-glass-border" />
            </div>

            <DemoButton className="w-full" />

            {/* Link registro */}
            <div className="mt-6 rounded-xl border border-glass-border bg-white/[0.03] p-3 text-center">
              <p className="text-sm text-ink-dim">
                ¿Sin cuenta?{' '}
                <Link
                  href="/register"
                  className="font-medium text-core transition-all hover:text-core/80 hover:underline"
                >
                  Crear cuenta gratis →
                </Link>
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </GuestGuard>
  )
}
