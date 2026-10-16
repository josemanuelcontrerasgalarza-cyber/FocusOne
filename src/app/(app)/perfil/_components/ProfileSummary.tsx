'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { useAuthStore } from '@/store/authStore'
import { computeXP, levelFromXP } from '@/lib/kairo/xp'
import { Avatar, Badge, Card, ProgressBar } from '@/components/ui/primitives'
import { UpgradeAccount } from './UpgradeAccount'

function hours(min: number): string {
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * Tarjeta de usuario: nombre/correo (perfil del espacio o sesión), tipo de
 * cuenta y nivel calculado a partir de la actividad real (si hay totales).
 */
export function ProfileSummary() {
  const profile = useWorkspace((s) => s.profile)
  const totals = useWorkspace((s) => s.totals)
  const mode = useWorkspace((s) => s.mode)
  const session = useAuthStore((s) => s.session)
  const authUser = useAuthStore((s) => s.user)
  const isDemo = useAuthStore((s) => s.isDemo)

  const email = profile?.email || session?.user.email || authUser?.email || null
  const name =
    profile?.name?.trim() ||
    authUser?.name?.trim() ||
    email?.split('@')[0] ||
    (mode === 'local' ? 'Tú' : isDemo ? 'Invitado' : 'Tu cuenta')

  const account =
    mode === 'local'
      ? { label: 'Modo local', tone: 'neutral' as const }
      : isDemo
        ? { label: 'Cuenta de prueba', tone: 'warm' as const }
        : { label: 'Cuenta', tone: 'neutral' as const }

  const lv = totals ? levelFromXP(computeXP(totals)) : null
  const streak = profile?.streak_current ?? 0

  return (
    <Card as="section" className="p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <Avatar name={name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">{name}</p>
            <Badge tone={account.tone}>{account.label}</Badge>
          </div>
          <p className="truncate text-sm text-ink-dim">
            {email ?? (mode === 'local' ? 'Tus datos se guardan en este navegador' : 'Sin correo vinculado')}
          </p>
        </div>
      </div>

      {isDemo && mode !== 'local' && <UpgradeAccount />}

      {lv && totals && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-ink">
              <span className="font-semibold">Nivel {lv.level}</span>
              <span className="text-ink-dim"> · {lv.title}</span>
            </p>
            <p className="font-mono text-[12px] text-ink-faint">
              {lv.into} / {lv.span} XP
            </p>
          </div>
          <ProgressBar value={lv.progress} className="mt-2" />

          <dl className="mt-5 grid grid-cols-3 gap-3">
            <div>
              <dt className="k-eyebrow">Tareas</dt>
              <dd className="mt-1 font-mono text-[20px] font-medium tracking-[-0.02em] text-ink">{totals.tasksCompleted}</dd>
            </div>
            <div>
              <dt className="k-eyebrow">Enfoque</dt>
              <dd className="mt-1 font-mono text-[20px] font-medium tracking-[-0.02em] text-ink">{hours(totals.focusMinutes)}</dd>
            </div>
            <div>
              <dt className="k-eyebrow">Racha</dt>
              <dd className="mt-1 font-mono text-[20px] font-medium tracking-[-0.02em] text-ink">
                {streak} <span className="text-[13px] text-ink-faint">{streak === 1 ? 'día' : 'días'}</span>
              </dd>
            </div>
          </dl>

          <Link
            href="/estadisticas"
            className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink-dim transition-colors hover:text-ink"
          >
            Ver estadísticas <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
    </Card>
  )
}
