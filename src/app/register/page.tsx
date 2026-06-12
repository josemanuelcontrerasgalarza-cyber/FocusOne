'use client'

import { useState } from 'react'
import Link from 'next/link'
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <GlassPanel className="w-full max-w-sm p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-gradient-to-br from-core to-plasma shadow-glow-plasma" />
            <h1 className="font-display text-2xl font-semibold">Crea tu cuenta</h1>
            <p className="mt-1 text-sm text-ink-dim">Tu centro de mando te espera.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            <Button type="submit" variant="plasma" loading={loading} fullWidth size="lg" className="mt-2">
              Iniciar despegue
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-dim">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-core hover:underline">
              Entrar
            </Link>
          </p>
        </GlassPanel>
      </div>
    </GuestGuard>
  )
}
