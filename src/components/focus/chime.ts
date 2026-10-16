/**
 * Campana suave generada con WebAudio (sin archivos de audio). El contexto se
 * "desbloquea" con un gesto del usuario (p. ej. al pulsar Iniciar) para que
 * luego pueda sonar aunque la pestaña esté en segundo plano.
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Llamar dentro de un gesto del usuario. */
export function unlockAudio() {
  getCtx()
}

/**
 * `focus` — fin de un bloque de enfoque (dos notas que descienden: suelta).
 * `break` — fin de un descanso (dos notas que ascienden: vuelve).
 */
export function playChime(kind: 'focus' | 'break', volume: number) {
  const v = Math.max(0, Math.min(1, volume))
  if (v <= 0) return
  const ac = getCtx()
  if (!ac) return
  const notes = kind === 'focus' ? [880, 659.25] : [659.25, 880]
  const t0 = ac.currentTime + 0.03
  notes.forEach((freq, i) => {
    const start = t0 + i * 0.24
    // Fundamental + un parcial suave para un timbre de campana.
    for (const [mult, weight] of [
      [1, 1],
      [2.01, 0.18],
    ] as const) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq * mult
      const peak = 0.16 * v * weight
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.8)
      osc.connect(gain).connect(ac.destination)
      osc.start(start)
      osc.stop(start + 1.9)
    }
  })
}
