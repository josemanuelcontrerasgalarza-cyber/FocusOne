'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { GuestGuard, ConfigNotice } from '@/components/AuthGuard'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'
import { toast } from '@/lib/toast'

export default function RegisterPage() {
  const { signUp, loading } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const pwdLength = password.length
  const pwdStrength =
    pwdLength === 0 ? 'empty' : pwdLength < 6 ? 'weak' : pwdLength < 10 ? 'ok' : 'strong'

  const strengthConfig = {
    empty: { label: '', bars: 0, color: '' },
    weak: { label: 'Débil', bars: 1, color: 'bg-nova' },
    ok: { label: 'Aceptable', bars: 2, color: 'bg-solar' },
    strong: { label: 'Segura', bars: 3, color: 'bg-core' },
  }[pwdStrength]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('La contraseña necesita al menos 8 caracteres')
      return
    }
    try {
      await signUp(email, password, name)
      toast.success('Cuenta creada. Revisa tu correo si pide confirmación.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la cuenta')
    }
  }

  return (
    <GuestGuard>
      <ConfigNotice />
      <div className="relative flex min-h-screen items-center justify-center p-4">
        {/* Fondo con glow plasma */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-plasma/5 blur-[120px]" />
          <div className="absolute left-1/3 top-2/3 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-core/[0.04] blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          className="relative w-full max-w-sm"
        >
          <GlassPanel className="card-accent-plasma p-8" tilt={false}>
            {/* Logo con acento plasma */}
            <div className="mb-8 text-center">
              <div className="relative mx-auto mb-5 h-16 w-16">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-plasma to-core"
                />
                <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-plasma via-core to-plasma shadow-glow-plasma" />
              </div>

              <h1 className="font-display text-2xl font-semibold">Crea tu cuenta</h1>
              <p className="mt-1.5 text-sm text-ink-dim">Tu centro de mando te espera.</p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-data text-[10px] uppercase tracking-wider text-ink-ghost">
                  Nombre
                </label>
                <input
                  required
                  placeholder="Tu nombre"
                  className="glass-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

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
                <div className="flex items-center justify-between">
                  <label className="font-data text-[10px] uppercase tracking-wider text-ink-ghost">
                    Contraseña
                  </label>
                  {pwdStrength !== 'empty' && (
                    <span
                      className={`font-data text-[9px] uppercase tracking-wider ${
                        pwdStrength === 'weak'
                          ? 'text-nova'
                          : pwdStrength === 'ok'
                            ? 'text-solar'
                            : 'text-core'
                      }`}
                    >
                      {strengthConfig.label}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  className="glass-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {/* Indicador visual de fortaleza */}
                {pwdStrength !== 'empty' && (
                  <div className="flex gap-1 pt-0.5">
                    {[1, 2, 3].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          bar <= strengthConfig.bars ? strengthConfig.color : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                )}
                <p className="font-data text-[9px] text-ink-ghost">
                  {pwdLength > 0
                    ? `${pwdLength} caracteres${pwdLength < 8 ? ` — faltan ${8 - pwdLength}` : ''}`
                    : 'Mín. 8 caracteres'}
                </p>
              </div>

              <Button
                type="submit"
                variant="plasma"
                loading={loading}
                fullWidth
                size="lg"
                className="mt-3"
              >
                Iniciar despegue
              </Button>
            </form>

            {/* Link login */}
            <div className="mt-6 rounded-xl border border-glass-border bg-white/[0.03] p-3 text-center">
              <p className="text-sm text-ink-dim">
                ¿Ya tienes cuenta?{' '}
                <Link
                  href="/login"
                  className="font-medium text-[#c4b5fd] transition-all hover:text-plasma hover:underline"
                >
                  Entrar →
                </Link>
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </GuestGuard>
  )
}
