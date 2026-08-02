'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2, Flame } from 'lucide-react'
import { toast } from '@/lib/toast'
import {
  MOCK_QUESTIONS,
  computeScore,
  previewPoints,
  saveQuizResult,
  type QuizOutcome,
} from '@/lib/quiz'
import type { Mission } from '@/types'

interface Props {
  mission: Mission
  uid?: string
  isDemo: boolean
  onClose: () => void
  onCompleted: (outcome: QuizOutcome) => void
}

/**
 * Quiz de cierre (Fase 4): 3-5 preguntas MOCK, una a la vez. Al terminar,
 * guarda en quiz_results (el servidor calcula puntos), marca la misión como
 * forjada y dispara la notificación ESP32 — todo dentro de saveQuizResult.
 *
 * En demo (sin sesión/misión real) solo previsualiza el resultado sin escribir.
 */
export function QuizModal({ mission, uid, isDemo, onClose, onCompleted }: Props) {
  const total = MOCK_QUESTIONS.length
  const canSave = Boolean(uid) && !isDemo && mission.id !== 'demo'

  const [step, setStep] = useState(0) // 0..total-1 = preguntas; total = resultado
  const [answers, setAnswers] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<QuizOutcome | null>(null)

  // Defensa: sin preguntas no hay quiz que mostrar (evita leer question undefined).
  if (total === 0) return null

  async function choose(optionIndex: number) {
    if (saving) return
    const nextAnswers = [...answers]
    nextAnswers[step] = optionIndex
    setAnswers(nextAnswers)

    if (step < total - 1) {
      setStep(step + 1)
      return
    }

    // Última pregunta respondida → cerrar.
    if (canSave && uid) {
      setSaving(true)
      try {
        const outcome = await saveQuizResult(uid, mission, nextAnswers)
        setResult(outcome)
        setStep(total)
      } catch {
        toast.error('No se pudo guardar el cierre. Inténtalo de nuevo.')
      } finally {
        setSaving(false)
      }
    } else {
      // Demo: solo previsualiza.
      const score = computeScore(nextAnswers)
      setResult({ score, pointsEarned: previewPoints(score) })
      setStep(total)
    }
  }

  const showingResult = step >= total
  const question = MOCK_QUESTIONS[Math.min(step, total - 1)]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={showingResult ? undefined : onClose}
      />

      {/* Panel */}
      <motion.div
        className="relative w-full max-w-md rounded-forge border border-forge-line bg-forge-surface p-6 shadow-ember"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
      >
        {!showingResult && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-4 text-forge-ink-faint transition-colors hover:text-forge-ink"
          >
            <X size={18} />
          </button>
        )}

        {showingResult && result ? (
          <ResultView
            result={result}
            missionTitle={mission.title}
            isDemo={!canSave}
            onForge={() => onCompleted(result)}
          />
        ) : (
          <>
            {/* Cabecera + progreso */}
            <div className="mb-1 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-ember">
              Cierre de misión
            </div>
            <p className="mb-4 text-sm text-forge-ink-dim">{mission.title}</p>

            <div className="mb-6 flex gap-1.5">
              {MOCK_QUESTIONS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i <= step ? 'bg-ember' : 'bg-forge-line'
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-1 font-num text-xs text-forge-ink-faint">
                  Pregunta {step + 1} de {total}
                </div>
                <h3 className="mb-5 font-forge text-xl font-bold text-forge-ink">
                  {question.prompt}
                </h3>

                <div className="flex flex-col gap-2.5">
                  {question.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => choose(i)}
                      disabled={saving}
                      className="flex items-center justify-between gap-3 rounded-forge border border-forge-line bg-forge-canvas px-4 py-3.5 text-left font-forge text-[15px] text-forge-ink transition-colors hover:border-ember/50 hover:bg-ember/[0.06] disabled:opacity-50"
                    >
                      {opt.label}
                      {saving && step === total - 1 && (
                        <Loader2 size={16} className="animate-spin text-ember" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  )
}

function ResultView({
  result,
  missionTitle,
  isDemo,
  onForge,
}: {
  result: QuizOutcome
  missionTitle: string
  isDemo: boolean
  onForge: () => void
}) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ember/15 shadow-ember"
      >
        <Check size={30} className="text-ember" strokeWidth={2.6} />
      </motion.div>

      <h3 className="font-forge text-2xl font-extrabold text-forge-ink">
        Misión forjada
      </h3>
      <p className="mt-1 truncate text-sm text-forge-ink-dim">{missionTitle}</p>

      <div className="my-6 flex items-center justify-center gap-8">
        <div>
          <div className="font-num text-3xl font-semibold text-forge-ink">
            {result.score}
            <span className="text-lg text-forge-ink-faint">/100</span>
          </div>
          <div className="mt-0.5 text-xs text-forge-ink-dim">Score</div>
        </div>
        <div>
          <div className="font-num text-3xl font-semibold text-ember">
            +{result.pointsEarned}
          </div>
          <div className="mt-0.5 text-xs text-forge-ink-dim">Puntos</div>
        </div>
      </div>

      {isDemo && (
        <p className="mb-4 text-xs text-forge-ink-faint">
          Vista previa (demo): no se guardó en tu cuenta.
        </p>
      )}

      <button
        onClick={onForge}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ember px-6 py-3.5 font-forge text-[15px] font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px"
      >
        <Flame size={16} /> Forjar
      </button>
    </div>
  )
}
