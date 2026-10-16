import type { Metadata } from 'next'
import { LoginView } from './_components/LoginView'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Entra en Kairo y retoma lo importante.',
  alternates: { canonical: '/login' },
}

export default function LoginPage() {
  return <LoginView />
}
