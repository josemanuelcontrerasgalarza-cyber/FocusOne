'use client'

import { useState, type InputHTMLAttributes } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`k-input h-11 pr-11 ${props.className ?? ''}`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-control text-ink-faint transition-colors hover:text-ink"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

/** Error de formulario, claro y junto al botón de envío. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-control border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
      <AlertCircle size={16} className="mt-px shrink-0" />
      <span>{message}</span>
    </div>
  )
}
