'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { GuestGuard, ConfigNotice } from '@/components/AuthGuard'
import { AuthShell, OrDivider } from '@/components/auth/AuthShell'
import { DemoButton } from '@/components/auth/DemoButton'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { ButtonLink } from '@/components/intro/ButtonLink'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/primitives'
import { PasswordInput, FormError } from '@/components/auth/fields'

export function LoginView() {
  const { signIn, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Conserva ?next= al pasar a "Crear cuenta".
  const [nextQs, setNextQs] = useState('')

  // Vuelta fallida de Google (/auth/callback → /login?error=oauth).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'oauth') {
      setError('No se pudo completar el acceso con Google. Inténtalo de nuevo.')
    }
    const next = params.get('next')
    if (next) setNextQs(`?next=${encodeURIComponent(next)}`)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await signIn(email.trim(), password)
      // La redirección la hace GuestGuard al recibir la sesión (respeta ?next=).
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.')
    }
  }

  return (
    <GuestGuard>
      <AuthShell
        aside={
          <ButtonLink href={`/register${nextQs}`} variant="ghost" size="sm" className="h-9 text-sm">
            Crear cuenta
          </ButtonLink>
        }
      >
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[32px]">
          Hola de nuevo
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-dim">Entra y retoma donde lo dejaste.</p>

        <ConfigNotice className="mt-6" />

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Field label="Correo" htmlFor="login-email">
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="tu@correo.com"
              className="k-input h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Contraseña" htmlFor="login-password">
            <PasswordInput
              id="login-password"
              required
              autoComplete="current-password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <FormError message={error} />

          <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-1 w-full">
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <OrDivider />

        <div className="flex flex-col gap-2.5">
          <GoogleButton className="w-full" onError={setError} />
          <DemoButton className="w-full" />
        </div>

        <p className="mt-8 text-center text-sm text-ink-dim">
          ¿Aún no tienes cuenta?{' '}
          <Link href={`/register${nextQs}`} className="font-medium text-ink underline-offset-4 hover:underline">
            Crear una gratis
          </Link>
        </p>
      </AuthShell>
    </GuestGuard>
  )
}
