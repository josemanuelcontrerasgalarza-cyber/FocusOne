'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { GuestGuard, ConfigNotice } from '@/components/AuthGuard'
import { ForgeDemoButton } from '@/components/forge/ForgeDemoButton'
import { GoogleButton } from '@/components/forge/GoogleButton'
import { toast } from '@/lib/toast'

const inputCls =
  'w-full rounded-lg border border-forge-line bg-forge-canvas px-4 py-2.5 text-sm text-forge-ink outline-none placeholder:text-forge-ink-faint focus:border-ember/50'

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
      <main className="relative z-10 flex min-h-screen items-center justify-center bg-forge-canvas p-4 font-forge text-forge-ink">
        <div className="forge-panel w-full max-w-sm p-8">
          <div className="mb-8 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="h-3 w-3 rounded-[2px] bg-ember" />
              <span className="font-forge text-xl font-extrabold tracking-tight">FocusOne</span>
            </div>
            <p className="text-sm text-forge-ink-dim">Termina lo que empiezas.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="correo@ejemplo.com"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              placeholder="Contraseña"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-ember px-6 py-3 font-forge text-[15px] font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px disabled:opacity-50"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 font-num text-[11px] uppercase tracking-[0.2em] text-forge-ink-faint">
            <span className="h-px flex-1 bg-forge-line" />
            o
            <span className="h-px flex-1 bg-forge-line" />
          </div>

          <div className="flex flex-col gap-2.5">
            <GoogleButton className="w-full" />
            <ForgeDemoButton className="w-full" />
          </div>

          <p className="mt-6 text-center text-sm text-forge-ink-dim">
            ¿Sin cuenta?{' '}
            <Link href="/register" className="text-ember hover:underline">
              Crear una
            </Link>
          </p>
        </div>
      </main>
    </GuestGuard>
  )
}
