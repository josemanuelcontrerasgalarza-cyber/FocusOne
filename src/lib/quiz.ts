import { supabase } from '@/lib/supabase'
import { notificarESP32 } from '@/lib/notificarESP32'
import type { Mission } from '@/types'

export interface QuizOption {
  label: string
  /** Peso 0..1 que aporta al score. */
  value: number
}

export interface QuizQuestion {
  id: string
  prompt: string
  options: QuizOption[]
}

/**
 * Preguntas de reflexión del quiz de cierre. Son fijas por diseño (no hay
 * generación por IA): un ritual breve para verificar y sellar la misión.
 */
export const MOCK_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: '¿Completaste el objetivo principal de la misión?',
    options: [
      { label: 'Sí, por completo', value: 1 },
      { label: 'En gran parte', value: 0.6 },
      { label: 'A medias', value: 0.3 },
    ],
  },
  {
    id: 'q2',
    prompt: '¿Qué tan enfocado estuviste durante la sesión?',
    options: [
      { label: 'Muy enfocado', value: 1 },
      { label: 'Con algunas distracciones', value: 0.6 },
      { label: 'Muy distraído', value: 0.2 },
    ],
  },
  {
    id: 'q3',
    prompt: '¿Lograste un avance real o aprendiste algo clave?',
    options: [
      { label: 'Sí, un avance concreto', value: 1 },
      { label: 'Un avance menor', value: 0.5 },
      { label: 'No mucho', value: 0.2 },
    ],
  },
  {
    id: 'q4',
    prompt: '¿Dejaste listo el siguiente paso?',
    options: [
      { label: 'Sí, sé exactamente qué sigue', value: 1 },
      { label: 'Más o menos', value: 0.5 },
      { label: 'No', value: 0.1 },
    ],
  },
]

/**
 * Score 0..100 a partir de las respuestas (índice de opción por pregunta).
 * Promedio de los pesos de las opciones elegidas.
 */
export function computeScore(answers: number[]): number {
  if (answers.length === 0) return 0
  const sum = answers.reduce((acc, optIdx, qIdx) => {
    const opt = MOCK_QUESTIONS[qIdx]?.options[optIdx]
    return acc + (opt?.value ?? 0)
  }, 0)
  return Math.round((sum / MOCK_QUESTIONS.length) * 100)
}

/** Fórmula espejo de la del servidor, para previsualizar puntos en demo. */
export function previewPoints(score: number): number {
  return 10 + Math.floor(score / 10)
}

export interface QuizOutcome {
  score: number
  pointsEarned: number
}

/**
 * Persiste el cierre de la misión: inserta en quiz_results (el trigger calcula
 * points_earned y actualiza points), marca la misión como completada y dispara
 * la notificación física ESP32 de "misión verificada por quiz".
 *
 * Devuelve el score y los puntos otorgados (leídos del servidor).
 */
export async function saveQuizResult(
  uid: string,
  mission: Mission,
  answers: number[],
): Promise<QuizOutcome> {
  const score = computeScore(answers)
  const questionsJson = MOCK_QUESTIONS.map((q, i) => ({
    id: q.id,
    prompt: q.prompt,
    selected: answers[i],
    selectedLabel: q.options[answers[i]]?.label ?? null,
  }))

  // points_earned lo calcula el trigger en el servidor; lo leemos de vuelta.
  const { data, error } = await supabase
    .from('quiz_results')
    .insert({
      user_id: uid,
      mission_id: mission.id,
      questions_json: questionsJson,
      score,
    })
    .select('points_earned')
    .single()
  if (error) throw error

  // Verificada por quiz → marcar la misión como forjada.
  const { error: missionErr } = await supabase
    .from('missions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', mission.id)
    .eq('user_id', uid)
  if (missionErr) throw missionErr

  // Notificación física: misión verificada por quiz (fire-and-forget).
  void notificarESP32(uid, 'mision_completada')

  return { score, pointsEarned: data?.points_earned ?? previewPoints(score) }
}
