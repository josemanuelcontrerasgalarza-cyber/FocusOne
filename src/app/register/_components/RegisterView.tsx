'use client'

import { useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { MailCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { GuestGuard, ConfigNotice } from '@/components/AuthGuard'
import { AuthShell, OrDivider } from '@/components/auth/AuthShell'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { DemoButton } from '@/components/auth/DemoButton'
import { ButtonLink } from '@/components/intro/ButtonLink'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/primitives'
import { PasswordInput, FormError } from '@/components/auth/fields'

const MIN = 8

type Strength = 'empty' | 'weak' | 'ok' | 'strong'

// Por debajo del mínimo (8) es "Débil" para no llamar "Aceptable" a una
// contraseña que el envío va a rechazar.
function strengthOf(pwd: string): Strength {
  const n = pwd.length
  return n === 0 ? 'empty' : n < MIN ? 'weak' : n < 12 ? 'ok' : 'strong'
}

const STRENGTH: Record<Exclude<Strength, 'empty'>, { label: string; bars: number; fill: string; text: string }> = {
  weak: { label: 'Débil', bars: 1, fill: 'bg-danger', text: 'text-danger' },
  ok: { label: 'Aceptable', bars: 2, fill: 'bg-warning', text: 'text-warning' },
  strong: { label: 'Segura', bars: 3, fill: 'bg-success', text: 'text-success' },
}

export function RegisterView() {
  const { signUp, loading } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const strength = strengthOf(password)
  const cfg = strength === 'empty' ? null : STRENGTH[strength]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN) {
      setError(`La contraseña necesita al menos ${MIN} caracteres.`)
      return
    }
    try {
      await signUp(email.trim(), password, name.trim())
      // Si el proyecto no pide confirmación, llega la sesión y GuestGuard
      // redirige. Si la pide, mostramos el aviso de correo enviado.
      setSentTo(email.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta. Inténtalo de nuevo.')
    }
  }

  return (
    <GuestGuard>
      <AuthShell
        aside={
          <ButtonLink href="/login" variant="ghost" size="md">
            Entrar
          </ButtonLink>
        }
      >
        {sentTo ? (
          <div className="animate-fade-in">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-sunken text-ink">
              <MailCheck size={19} />
            </span>
            <h1 className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink">Revisa tu correo</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-dim">
              Te hemos enviado un enlace a <span className="font-medium text-ink">{sentTo}</span> para confirmar tu cuenta.
              Ábrelo y vuelve para entrar.
            </p>
            <div className="mt-8 flex flex-col gap-2.5">
              <ButtonLink href="/login" variant="primary" size="lg">
                Ir a Entrar
              </ButtonLink>
              <Button variant="ghost" onClick={() => setSentTo(null)}>
                Usar otro correo
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[32px]">
              Crea tu cuenta
            </h1>
            <p className="mt-1.5 text-[15px] text-ink-dim">Gratis. Empieza por lo importante en menos de un minuto.</p>

            <ConfigNotice className="mt-6" />

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <Field label="Nombre" htmlFor="reg-name">
                <input
                  id="reg-name"
                  required
                  autoComplete="given-name"
                  placeholder="Cómo quieres que te llamemos"
                  className="k-input h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>

              <Field label="Correo" htmlFor="reg-email">
                <input
                  id="reg-email"
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

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="reg-password" className="text-[13px] font-medium text-ink">
                    Contraseña
                  </label>
                  {cfg && <span className={clsx('text-xs font-medium', cfg.text)}>{cfg.label}</span>}
                </div>
                <PasswordInput
                  id="reg-password"
                  required
                  minLength={MIN}
                  autoComplete="new-password"
                  placeholder={`Mínimo ${MIN} caracteres`}
                  aria-describedby="reg-password-hint"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="flex gap-1 pt-0.5" aria-hidden>
                  {[1, 2, 3].map((bar) => (
                    <div
                      key={bar}
                      className={clsx(
                        'h-1 flex-1 rounded-full transition-colors duration-200',
                        cfg && bar <= cfg.bars ? cfg.fill : 'bg-sunken',
                      )}
                    />
                  ))}
                </div>
                <p id="reg-password-hint" className="font-mono text-[11px] text-ink-faint" aria-live="polite">
                  {password.length > 0
                    ? `${password.length} caracteres${password.length < MIN ? ` · faltan ${MIN - password.length}` : ''}`
                    : `Mínimo ${MIN} caracteres. Más largo es más seguro.`}
                </p>
              </div>

              <FormError message={error} />

              <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-1 w-full">
                {loading ? 'Creando tu cuenta…' : 'Crear cuenta'}
              </Button>
            </form>

            <OrDivider />

            <div className="flex flex-col gap-2.5">
              <GoogleButton className="w-full" onError={setError} />
              <DemoButton className="w-full" label="Probar antes sin registro" />
            </div>

            <p className="mt-8 text-center text-sm text-ink-dim">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
                Entrar
              </Link>
            </p>
          </>
        )}
      </AuthShell>
    </GuestGuard>
  )
}
