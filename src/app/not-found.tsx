import Link from 'next/link'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-core/5 blur-[120px]" />
      </div>
      <GlassPanel className="relative w-full max-w-sm p-8 text-center" tilt={false}>
        <p className="font-data text-xs uppercase tracking-[0.3em] text-ink-ghost">Error 404</p>
        <h1 className="mt-3 font-display text-2xl font-semibold">
          Esta misión <span className="text-gradient">no existe</span>
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          La página que buscas se perdió en la órbita. Vuelve al centro de mando.
        </p>
        <Link href="/hoy" className="mt-6 block">
          <Button fullWidth size="lg">
            Volver a Hoy
          </Button>
        </Link>
      </GlassPanel>
    </div>
  )
}
