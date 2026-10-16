import type { Metadata } from 'next'
import { RegisterView } from './_components/RegisterView'

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Crea tu cuenta de Kairo gratis y empieza por lo importante.',
  alternates: { canonical: '/register' },
}

export default function RegisterPage() {
  return <RegisterView />
}
