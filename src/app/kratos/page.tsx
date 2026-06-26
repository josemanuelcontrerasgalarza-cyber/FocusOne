'use client'

import { AppShell } from '@/components/AppShell'
import { KratosWorkspace } from '@/components/kratos/KratosWorkspace'

export default function KratosPage() {
  return (
    <AppShell>
      <KratosWorkspace />
    </AppShell>
  )
}
