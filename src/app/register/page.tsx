'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { GuestGuard, ConfigNotice } from '@/components/AuthGuard'
import { toast } from '@/lib/toast'

const inputCls =
  'w-full rounded-lg border border-forge-line bg-forge-canvas px-4 py-2.5 text-sm text-forge-ink outline-none placeholder:text-forge-ink-faint focus:border-ember/50'

export default function RegisterPage() {
  const { signUp, loading } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const pwdLength = password.length
  const pwdStrength =
    pwdLength === 0 ? 'empty' : pwdLength < 6 ? 'weak' : pwdLength < 10 ? 'ok' : 'strong'

  const strengthConfig = {
    empty: { label: '', bars: 0, color: '', text: '' },
    weak: { label: 'Débil', bars: 1, color: 'bg-forge-ink-faint', text: 'text-forge-ink-faint' },
    ok: { label: 'Aceptable', bars: 2, color: 'bg-metal', text: 'text-metal' },
    strong: { label: 'Segura', bars: 3, color: 'bg-ember', text: 'text-ember' },
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
      <main className="relative z-10 flex min-h-screen items-center justify-center bg-forge-canvas p-4 font-forge text-forge-ink">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,106,43,0.10), transparent 70%)' }}
        />
        <div className="relative w-full max-w-sm">
          <div className="forge-panel p-8">
            <div className="mb-8 text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="h-3 w-3 rounded-[2px] bg-ember" />
                <span className="font-forge text-xl font-extrabold tracking-tight">FocusOne</span>
              </div>
              <h1 className="font-forge text-2xl font-extrabold">Crea tu cuenta</h1>
              <p className="mt-1.5 text-sm text-forge-ink-dim">Tu primera misión te espera.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-num text-[10px] uppercase tracking-wider text-forge-ink-faint">
                  Nombre
                </label>
                <input
                  required
                  placeholder="Tu nombre"
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-num text-[10px] uppercase tracking-wider text-forge-ink-faint">
                  Correo
                </label>
                <input
                  type="email"
                  required
                  placeholder="correo@ejemplo.com"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-num text-[10px] uppercase tracking-wider text-forge-ink-faint">
                    Contraseña
                  </label>
                  {pwdStrength !== 'empty' && (
                    <span className={`font-num text-[9px] uppercase tracking-wider ${strengthConfig.text}`}>
                      {strengthConfig.label}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  className={inputCls}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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
                <p className="font-num text-[9px] text-forge-ink-faint">
                  {pwdLength > 0
                    ? `${pwdLength} caracteres${pwdLength < 8 ? ` — faltan ${8 - pwdLength}` : ''}`
                    : 'Mín. 8 caracteres'}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 rounded-full bg-ember px-6 py-3 font-forge text-[15px] font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px disabled:opacity-50"
              >
                {loading ? 'Creando…' : 'Crear cuenta'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-forge-ink-dim">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-ember hover:underline">
                Entrar →
              </Link>
            </p>
          </div>
        </div>
      </main>
    </GuestGuard>
  )
}
