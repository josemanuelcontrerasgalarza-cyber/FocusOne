'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ExternalLink, Sparkles, Timer } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Badge } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { relativeDayLabel, toDateKey } from '@/lib/kairo/dates'
import type { LocalNext, OverdueItem } from '@/lib/ai/local'
import { SourceTag } from './SourceTag'

/** "¿Qué hago ahora?" con el motor local de prioridad (explicable, sin IA). */
export function NextMoveCard({ data, onAskAi }: { data: LocalNext; onAskAi?: () => void }) {
  const openTask = useUI((s) => s.openTask)
  const exists = useWorkspace((s) => (data.move ? s.tasks.some((t) => t.id === data.move!.taskId && t.status !== 'completed') : false))

  if (!data.move) {
    return (
      <div className="space-y-2">
        <SourceTag source="local" />
        <p className="text-[14px] text-ink">Todo al día. No tienes tareas abiertas; captura la siguiente cuando aparezca.</p>
      </div>
    )
  }
  const m = data.move
  return (
    <div className="space-y-3">
      <SourceTag source="local" />
      <div className="rounded-control border border-line bg-raised p-3">
        <p className="k-eyebrow">Tu siguiente movimiento</p>
        <p className="mt-1 text-[15px] font-semibold text-ink">{m.title}</p>
        {m.parentTitle && <p className="text-[13px] text-ink-dim">Paso de: {m.parentTitle}</p>}
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px] text-ink-dim marker:text-ink-faint">
          {m.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {exists ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/enfoque?task=${encodeURIComponent(m.taskId)}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-[13px] font-medium text-ink transition-colors hover:border-line-strong"
            >
              <Timer size={14} aria-hidden /> Enfocar ahora
            </Link>
            <Button size="sm" variant="ghost" icon={<ExternalLink size={14} />} onClick={() => openTask(m.taskId)}>
              Abrir tarea
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-ink-faint">Esta tarea ya está completada o no existe.</p>
        )}
      </div>
      {data.after.length > 0 && (
        <div>
          <p className="k-eyebrow mb-1">Después</p>
          <ul className="space-y-1">
            {data.after.map((a) => (
              <li key={a.taskId} className="flex items-center justify-between gap-2 text-[13px] text-ink-dim">
                <span className="min-w-0 truncate">
                  <span className="text-ink">{a.title}</span>
                  {a.reasons[0] && <span> · {a.reasons[0]}</span>}
                </span>
                <IconButton label={`Abrir ${a.title}`} size="sm" onClick={() => openTask(a.taskId)}>
                  <ExternalLink size={13} />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}
      {onAskAi && (
        <Button size="sm" variant="ghost" icon={<Sparkles size={14} />} onClick={onAskAi}>
          Pedir matiz a la IA
        </Button>
      )}
    </div>
  )
}

/** Tareas vencidas (lista local). */
export function OverdueCard({ items, onAskAi }: { items: OverdueItem[]; onAskAi?: () => void }) {
  const openTask = useUI((s) => s.openTask)
  const tasks = useWorkspace((s) => s.tasks)
  const openIds = useMemo(() => new Set(tasks.filter((t) => t.status !== 'completed').map((t) => t.id)), [tasks])
  const today = toDateKey(new Date())
  const visible = items.filter((i) => openIds.has(i.taskId))

  return (
    <div className="space-y-3">
      <SourceTag source="local" />
      {visible.length === 0 ? (
        <p className="text-[14px] text-ink">Todo al día. No tienes tareas vencidas.</p>
      ) : (
        <>
          <p className="text-[14px] text-ink">
            {visible.length === 1 ? 'Tienes 1 tarea vencida.' : `Tienes ${visible.length} tareas vencidas.`} Decide para cada una:
            hacerla hoy, reprogramarla o soltarla.
          </p>
          <ul className="divide-y divide-line overflow-hidden rounded-control border border-line bg-raised">
            {visible.slice(0, 15).map((i) => (
              <li key={i.taskId} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{i.title}</span>
                <Badge tone="danger">{relativeDayLabel(i.due, today)}</Badge>
                <IconButton label={`Abrir ${i.title}`} size="sm" onClick={() => openTask(i.taskId)}>
                  <ExternalLink size={13} />
                </IconButton>
              </li>
            ))}
          </ul>
          {visible.length > 15 && <p className="text-xs text-ink-faint">Y {visible.length - 15} más en Tareas.</p>}
          {onAskAi && (
            <Button size="sm" variant="ghost" icon={<Sparkles size={14} />} onClick={onAskAi}>
              Ayúdame a priorizarlas
            </Button>
          )}
        </>
      )}
    </div>
  )
}
