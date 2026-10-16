'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import {
  AlertCircle,
  ArrowUp,
  CalendarClock,
  Compass,
  FolderKanban,
  KeyRound,
  ListTree,
  Loader2,
  LogIn,
  RotateCcw,
  Sparkles,
  Unlock,
  WifiOff,
  AlarmClock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import { LIMITS } from '@/lib/ai/types'
import type { AiStatus } from '@/lib/ai/client'
import { useAssistant, type ChatItem } from '@/components/assistant/useAssistant'
import { RichText } from '@/components/assistant/RichText'
import { PlanCard } from '@/components/assistant/PlanCard'
import { BreakdownCard } from '@/components/assistant/BreakdownCard'
import { NextMoveCard, OverdueCard } from '@/components/assistant/LocalCards'
import { TaskPicker } from '@/components/assistant/TaskPicker'
import { ContextDisclosure } from '@/components/assistant/ContextDisclosure'
import { SourceTag } from '@/components/assistant/SourceTag'

type PickerMode = 'breakdown' | 'unblock' | null

const PENDING_LABEL: Record<string, string> = {
  chat: 'Pensando…',
  plan: 'Preparando tu plan…',
  breakdown: 'Dividiendo la tarea…',
  unblock: 'Buscando un primer paso…',
  review: 'Revisando tus proyectos…',
}

export function AssistantView() {
  const a = useAssistant()
  const wsStatus = useWorkspace((s) => s.status)
  const router = useRouter()
  const params = useSearchParams()
  const [draft, setDraft] = useState('')
  const [picker, setPicker] = useState<PickerMode>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const autoRan = useRef(false)

  const aiUsable = a.ai === 'ready' || a.ai === 'checking'
  const busy = Boolean(a.pending)

  // ?prompt=plan → "Planifica mi día" una sola vez (y se limpia la URL).
  useEffect(() => {
    if (autoRan.current || !a.hydrated || a.ai === 'checking') return
    if (wsStatus !== 'ready' && wsStatus !== 'error') return
    if (params.get('prompt') !== 'plan') return
    autoRan.current = true
    a.run('plan', 'Planifica mi día')
    router.replace('/asistente', { scroll: false })
  }, [a, a.hydrated, a.ai, wsStatus, params, router])

  // Mantener a la vista lo último.
  const count = a.items.length
  useEffect(() => {
    if (!count && !busy) return
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [count, busy, a.error])

  function submit() {
    if (!draft.trim() || busy || !aiUsable) return
    a.send(draft)
    setDraft('')
    requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.style.height = ''
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const needsAi = aiUsable ? undefined : 'Necesita el asistente con IA'

  const chips: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string }[] = [
    { label: 'Planifica mi día', icon: <CalendarClock size={14} />, onClick: () => a.run('plan', 'Planifica mi día') },
    { label: '¿Qué hago ahora?', icon: <Compass size={14} />, onClick: a.whatNow },
    { label: 'Divide una tarea…', icon: <ListTree size={14} />, onClick: () => setPicker('breakdown'), disabled: !aiUsable, title: needsAi },
    { label: 'Tareas vencidas', icon: <AlarmClock size={14} />, onClick: a.overdue },
    { label: 'Resume mis proyectos', icon: <FolderKanban size={14} />, onClick: () => a.run('review', 'Resume mis proyectos'), disabled: !aiUsable, title: needsAi },
    { label: 'Desbloquéame', icon: <Unlock size={14} />, onClick: () => setPicker('unblock'), disabled: !aiUsable, title: needsAi },
  ]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-8">
      <PageHeader
        eyebrow="IA"
        title="Asistente"
        description="Planifica, divide y desbloquea con tus datos reales. Tú decides qué se aplica."
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => {
              a.reset()
              setDraft('')
              inputRef.current?.focus()
            }}
            disabled={!a.items.length && !busy && !a.error}
          >
            Nueva conversación
          </Button>
        }
      />

      <div className="mt-5 space-y-3">
        <AiNotice status={a.ai} />
        <ContextDisclosure />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Acciones rápidas">
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={c.onClick}
            disabled={busy || c.disabled}
            title={c.title}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-medium text-ink-dim transition-colors hover:border-line-strong hover:text-ink disabled:pointer-events-none disabled:opacity-45"
          >
            <span aria-hidden>{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      <section className="mt-5 min-h-[30vh]" aria-label="Conversación">
        {a.hydrated && !a.items.length && !busy && (
          <EmptyState
            icon={<Sparkles size={18} />}
            title="¿Qué quieres resolver ahora?"
            description={
              aiUsable
                ? 'Usa una acción rápida o escribe tu pregunta. El asistente solo ve el resumen descrito arriba.'
                : 'Sin IA puedes usar «¿Qué hago ahora?», «Tareas vencidas» y un plan del día básico, calculados en tu dispositivo.'
            }
          />
        )}
        {/* La región viva existe siempre para que se anuncie también el primer mensaje. */}
        <ol className="space-y-4" aria-live="polite" aria-relevant="additions">
          {a.items.map((it) => (
            <Message key={it.id} item={it} ai={aiUsable} assistant={a} />
          ))}
        </ol>

        {a.pending && (
          <div className="mt-4 flex items-center gap-3 text-[13px] text-ink-dim" role="status">
            <Loader2 size={15} className="animate-spin" aria-hidden />
            {PENDING_LABEL[a.pending.mode]}
            <button type="button" onClick={a.cancel} className="text-ink-faint underline-offset-2 hover:text-ink hover:underline">
              Cancelar
            </button>
          </div>
        )}

        {a.error && (
          <div className="mt-4 flex flex-wrap items-start gap-3 rounded-control border border-danger/25 bg-danger/10 px-3.5 py-3 text-[13px] text-ink" role="alert">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <p className="min-w-0 flex-1">{a.error.message}</p>
            <div className="flex gap-2">
              {a.error.retryable && (
                <Button size="sm" variant="secondary" icon={<RotateCcw size={13} />} onClick={a.retry}>
                  Reintentar
                </Button>
              )}
              <Button size="sm" variant="quiet" onClick={a.dismissError}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </section>

      <form
        className="sticky bottom-16 z-10 mt-6 bg-canvas pb-2 pt-2 lg:bottom-0"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div
          className={clsx(
            'flex items-end gap-2 rounded-card border border-line bg-raised p-2 shadow-card transition-colors focus-within:border-line-strong',
            !aiUsable && 'opacity-70',
          )}
        >
          <label htmlFor="assistant-input" className="sr-only">
            Mensaje para el asistente
          </label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={LIMITS.message}
            disabled={!aiUsable}
            onChange={(e) => {
              setDraft(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`
            }}
            onKeyDown={onKeyDown}
            placeholder={aiUsable ? 'Pregunta lo que necesites… (Enter envía, Mayús+Enter salto de línea)' : 'El chat con IA no está disponible ahora'}
            className="max-h-[180px] min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed"
            aria-describedby="assistant-note"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="h-9 w-9 shrink-0 px-0"
            aria-label="Enviar mensaje"
            disabled={!draft.trim() || busy || !aiUsable}
          >
            <ArrowUp size={16} aria-hidden />
          </Button>
        </div>
        <p id="assistant-note" className="mt-1.5 flex justify-between gap-3 px-1 text-xs text-ink-faint">
          <span>Respuestas generadas por IA: revísalas antes de actuar.</span>
          {draft.length > LIMITS.message - 200 && (
            <span className="font-mono">
              {draft.length}/{LIMITS.message}
            </span>
          )}
        </p>
      </form>

      <TaskPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        title={picker === 'unblock' ? '¿Con qué tarea estás atascado?' : '¿Qué tarea quieres dividir?'}
        description={
          picker === 'unblock'
            ? 'El asistente te propondrá un primer paso de 5 minutos.'
            : 'Recibirás pasos editables; nada se crea hasta que lo confirmes.'
        }
        onPick={(t) => {
          const mode = picker
          setPicker(null)
          if (mode === 'breakdown') a.run('breakdown', `Divide «${t.title}»`, { taskId: t.id, taskTitle: t.title })
          else if (mode === 'unblock') a.run('unblock', `Desbloquéame con «${t.title}»`, { taskId: t.id, taskTitle: t.title })
        }}
      />
    </div>
  )
}

/* ───────────────────────── Mensajes ───────────────────────── */

function Message({ item, ai, assistant }: { item: ChatItem; ai: boolean; assistant: ReturnType<typeof useAssistant> }) {
  if (item.role === 'user') {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-card rounded-br-md bg-sunken px-3.5 py-2 text-[14px] text-ink">
          <span className="sr-only">Tú: </span>
          {item.text}
        </p>
      </li>
    )
  }

  let body: React.ReactNode
  switch (item.kind) {
    case 'text':
      body = (
        <div className="space-y-2">
          <SourceTag source="ai" />
          <RichText text={item.text} />
        </div>
      )
      break
    case 'plan':
      body = (
        <PlanCard
          plan={item.plan}
          source={item.source}
          appliedIds={item.appliedIds}
          onApplied={(ids) => assistant.patchItem(item.id, { appliedIds: ids })}
        />
      )
      break
    case 'breakdown':
      body = (
        <BreakdownCard
          taskId={item.taskId}
          taskTitle={item.taskTitle}
          steps={item.steps}
          added={item.added}
          onAdded={(n) => assistant.patchItem(item.id, { added: n })}
        />
      )
      break
    case 'next':
      body = (
        <NextMoveCard
          data={item.data}
          onAskAi={
            ai && item.data.move && !assistant.pending
              ? () =>
                  assistant.send(
                    `¿Qué hago ahora? El motor de Kairo sugiere «${item.data.move!.title}». ¿Algún matiz antes de empezar?`,
                  )
              : undefined
          }
        />
      )
      break
    case 'overdue':
      body = (
        <OverdueCard
          items={item.items}
          onAskAi={
            ai && !assistant.pending
              ? () => assistant.send('Ayúdame a priorizar mis tareas vencidas: qué hago hoy, qué reprogramo y qué suelto.')
              : undefined
          }
        />
      )
      break
  }
  return (
    <li className="animate-fade-in rounded-card border border-line bg-surface p-4">
      <span className="sr-only">Asistente: </span>
      {body}
    </li>
  )
}

/* ───────────────────────── Avisos de estado ───────────────────────── */

function AiNotice({ status }: { status: AiStatus }) {
  if (status === 'ready' || status === 'checking') return null
  const content =
    status === 'not_configured'
      ? {
          icon: <KeyRound size={16} />,
          title: 'El asistente con IA no está configurado',
          text: (
            <>
              Falta <code className="rounded bg-sunken px-1 font-mono text-xs">GROQ_API_KEY</code> en el servidor. Añádela a las
              variables de entorno y vuelve a desplegar. Mientras tanto, «¿Qué hago ahora?», «Tareas vencidas» y un plan del día
              básico se calculan en tu dispositivo, sin IA.
            </>
          ),
        }
      : status === 'offline'
        ? {
            icon: <WifiOff size={16} />,
            title: 'Sin conexión',
            text: 'Las funciones con IA vuelven cuando recuperes la conexión. Las locales siguen funcionando.',
          }
        : {
            icon: <LogIn size={16} />,
            title: 'Tu sesión ha caducado',
            text: 'Vuelve a iniciar sesión para usar el asistente con IA.',
          }
  return (
    <div className="flex gap-3 rounded-control border border-warm/30 bg-warm/10 px-3.5 py-3 text-[13px]" role="status">
      <span className="mt-0.5 shrink-0 text-warm" aria-hidden>
        {content.icon}
      </span>
      <div>
        <p className="font-semibold text-ink">{content.title}</p>
        <p className="mt-0.5 leading-relaxed text-ink-dim">{content.text}</p>
      </div>
    </div>
  )
}
