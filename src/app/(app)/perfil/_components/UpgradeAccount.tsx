'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/primitives'
import { FormError, PasswordInput } from '@/components/auth/fields'

/**
 * Convierte la cuenta de prueba (anónima) en una cuenta real conservando todos
 * los datos: el id de usuario no cambia (authStore.upgradeAccount).
 */
export function UpgradeAccount() {
  const { upgradeAccount, loading } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.')
      return
    }
    try {
      await upgradeAccount(email.trim(), password, name.trim())
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la cuenta. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="mt-4 rounded-control border border-warm/25 bg-warm/10 p-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-ink-dim">
          Estás en una cuenta de prueba. Guárdala con tu correo para no perder tu progreso.
        </p>
        {!open && (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)} className="self-start sm:self-auto">
            Guardar mi cuenta
          </Button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="up-name">
            <input id="up-name" required className="k-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
          </Field>
          <Field label="Correo" htmlFor="up-email">
            <input
              id="up-email"
              type="email"
              required
              className="k-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Contraseña" htmlFor="up-password" hint="Mínimo 8 caracteres" className="sm:col-span-2">
            <PasswordInput
              id="up-password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <FormError message={error} />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Guardar cuenta
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
