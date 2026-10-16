'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Check, Gem, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { toast } from '@/lib/toast'
import { MOCK_QUESTIONS, computeScore, previewPoints, saveQuizResult, type QuizOutcome } from '@/lib/quiz'

export interface QuizTask {
  id: string
  title: string
}

interface Props {
  open: boolean
  task: QuizTask
  /** Sin uid (sin sesión) solo se previsualiza el resultado, sin guardar. */
  uid?: string | null
  onClose: () => void
  /** El servidor ya cerró la tarea y otorgó los diamantes. */
  onSaved: (outcome: QuizOutcome) => void
}

/**
 * Cierre con reflexión: unas preguntas breves, una a la vez. El servidor
 * puntúa (RPC `close_mission`), marca la tarea como completada y otorga los
 * diamantes. Requiere que la tarea esté en estado `active` (modo nube).
 */
export function QuizModal({ open, task, uid, onClose, onSaved }: Props) {
  const total = MOCK_QUESTIONS.length
  const canSave = Boolean(uid)

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<QuizOutcome | null>(null)

  // Cada apertura empieza de cero.
  useEffect(() => {
    if (open) {
      setStep(0)
      setAnswers([])
      setSaving(false)
      setResult(null)
    }
  }, [open, task.id])

  if (total === 0) return null

  async function choose(optionIndex: number) {
    if (saving) return
    const next = [...answers]
    next[step] = optionIndex
    setAnswers(next)
    if (step < total - 1) {
      setStep(step + 1)
      return
    }
    if (canSave && uid) {
      setSaving(true)
      try {
        // lib/quiz solo usa el id de la tarea (tabla `missions`).
        const outcome = await saveQuizResult(uid, { id: task.id, title: task.title } as Parameters<typeof saveQuizResult>[1], next)
        setResult(outcome)
        setStep(total)
        onSaved(outcome)
      } catch {
        toast.error('No se pudo guardar el cierre. Inténtalo de nuevo.')
      } finally {
        setSaving(false)
      }
    } else {
      const score = computeScore(next)
      setResult({ score, pointsEarned: previewPoints(score) })
      setStep(total)
    }
  }

  const showingResult = step >= total && result
  const question = MOCK_QUESTIONS[Math.min(step, total - 1)]

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose()
      }}
      title={showingResult ? undefined : 'Cerrar con reflexión'}
      description={showingResult ? undefined : <span className="line-clamp-1">{task.title}</span>}
      size="sm"
    >
      {showingResult ? (
        <div className="py-4 text-center" aria-live="polite">
          <div className="mx-auto mb-4 flex h-14 w-14 animate-check-pop items-center justify-center rounded-full border border-accent-fg/30 bg-accent/15 text-accent-fg">
            <Check size={26} strokeWidth={2.4} />
          </div>
          <h2 className="font-display text-[32px] leading-tight text-ink">Tarea cerrada</h2>
          <p className="mx-auto mt-1 max-w-[18rem] truncate text-sm text-ink-dim">{task.title}</p>

          <dl className="my-6 grid grid-cols-2 divide-x divide-line rounded-control border border-line bg-surface py-3">
            <div>
              <dt className="k-eyebrow">Reflexión</dt>
              <dd className="mt-1 font-mono text-2xl font-medium text-ink">
                {result.score}
                <span className="text-sm text-ink-faint">/100</span>
              </dd>
            </div>
            <div>
              <dt className="k-eyebrow">Diamantes</dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 font-mono text-2xl font-medium text-accent-fg">
                <Gem size={16} strokeWidth={2} aria-hidden />+{result.pointsEarned}
              </dd>
            </div>
          </dl>

          {!canSave && <p className="mb-4 text-xs text-ink-faint">Vista previa: no se guardó en tu cuenta.</p>}

          <Button variant="primary" size="lg" className="w-full" onClick={onClose} data-autofocus>
            Listo
          </Button>
        </div>
      ) : (
        <div className="pb-2">
          <div className="mb-5 flex gap-1.5" aria-hidden>
            {MOCK_QUESTIONS.map((q, i) => (
              <span
                key={q.id}
                className={clsx('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-accent-fg' : 'bg-sunken')}
              />
            ))}
          </div>

          <div key={question.id} className="animate-fade-in">
            <p className="k-eyebrow mb-1.5">
              Pregunta {step + 1} de {total}
            </p>
            <h3 id={`quiz-q-${question.id}`} className="mb-4 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-ink">
              {question.prompt}
            </h3>
            <div role="group" aria-labelledby={`quiz-q-${question.id}`} className="flex flex-col gap-2">
              {question.options.map((opt, i) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => choose(i)}
                  disabled={saving}
                  className={clsx(
                    'flex items-center justify-between gap-3 rounded-control border px-3.5 py-3 text-left text-[14px] text-ink transition-colors',
                    answers[step] === i ? 'border-accent-fg/50 bg-accent/10' : 'border-line bg-surface hover:border-line-strong hover:bg-sunken',
                    'disabled:opacity-60',
                  )}
                >
                  {opt.label}
                  {saving && answers[step] === i && <Loader2 size={15} className="animate-spin text-ink-dim" aria-label="Guardando" />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button variant="quiet" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
              Atrás
            </Button>
            <p className="inline-flex items-center gap-1 text-xs text-ink-faint">
              <Gem size={12} aria-hidden /> Gana diamantes al cerrar
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}
