import { redirect } from 'next/navigation'

// Ruta del diseño anterior — retirada. Redirige a su equivalente en La Fragua.
export default function Page() {
  redirect('/hoy')
}
