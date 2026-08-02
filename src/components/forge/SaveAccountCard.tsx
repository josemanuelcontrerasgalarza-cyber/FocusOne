'use client'

import { useState } from 'react'
import { Save, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/lib/toast'

const inputCls =
  'w-full rounded-lg border border-forge-line bg-forge-canvas px-4 py-2.5 text-sm text-forge-ink outline-none placeholder:text-forge-ink-faint focus:border-ember/50'

/**
 * El modo demo (auth.signInAnonymously) es el embudo principal de entrada a
 * FocusOne, pero hasta ahora no había ninguna forma en la UI de convertirlo
 * en cuenta real — `upgradeAccount` existía en authStore sin ningún llamador.
 * Un usuario que prueba el demo, construye racha, viste su Focus Pet y
 * desbloquea recompensas podía perderlo todo sin ningún aviso. Esta tarjeta
 * solo se muestra en modo demo y ofrece guardar la cuenta conservando el id
 * (y por tanto todos los datos) del usuario anónimo.
 */
export function SaveAccountCard() {
  const { user, isDemo, upgradeAccount, loading } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (!isDemo) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('La contraseña necesita al menos 8 caracteres')
      return
    }
    try {
      await upgradeAccount(email, password, name || user?.name || '')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la cuenta')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-4 rounded-forge border border-ember/40 bg-ember/10 p-4 text-left transition-colors hover:border-ember/70"
      >
        <ShieldAlert size={20} className="shrink-0 text-ember" />
        <div className="min-w-0 flex-1">
          <p className="font-forge text-[15px] font-semibold text-forge-ink">
            Estás en modo demo
          </p>
          <p className="truncate text-[13px] text-forge-ink-faint">
            Tu racha, puntos y Focus Pet se pierden al cerrar sesión — guarda tu cuenta
          </p>
        </div>
        <Save size={18} className="shrink-0 text-ember" />
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-forge border border-ember/40 bg-forge-surface p-4"
    >
      <div>
        <p className="font-forge text-[15px] font-semibold text-forge-ink">Guardar cuenta</p>
        <p className="text-[13px] text-forge-ink-faint">
          Conserva todo tu progreso actual con un correo y contraseña.
        </p>
      </div>

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
        <label className="font-num text-[10px] uppercase tracking-wider text-forge-ink-faint">
          Contraseña
        </label>
        <input
          type="password"
          required
          placeholder="Mínimo 8 caracteres"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-full border border-forge-line px-4 py-2.5 font-forge text-[14px] font-semibold text-forge-ink-dim transition-colors hover:border-forge-ink-faint"
        >
          Ahora no
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-full bg-ember px-4 py-2.5 font-forge text-[14px] font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px disabled:opacity-50"
        >
          {loading ? 'Guardando…' : 'Guardar cuenta'}
        </button>
      </div>
    </form>
  )
}
