'use client'

/**
 * Aviso de fin de sesión de Deep Work. Sin esto, alguien que se distrae y
 * cambia de pestaña durante los 25-90 min de la sesión no se entera de que
 * terminó hasta que vuelve por su cuenta — justo el momento donde más se
 * pierde el impulso de retomar la siguiente tarea.
 */

let titleFlashTimer: ReturnType<typeof setInterval> | null = null
let titleFlashCleanup: (() => void) | null = null
const ORIGINAL_TITLE = typeof document !== 'undefined' ? document.title : ''

/** Pide permiso de notificaciones del navegador si nunca se preguntó. Best-effort. */
export function requestNotificationPermission() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
  void Notification.requestPermission()
}

/** Chime de dos tonos generado con Web Audio (sin assets que mantener). */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const tones = [523.25, 783.99] // C5 → G5
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.15
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.4)
    })
    setTimeout(() => void ctx.close(), 1000)
  } catch {
    // Web Audio no disponible/bloqueado: sin sonido, no es crítico.
  }
}

function stopTitleFlash() {
  if (titleFlashTimer) clearInterval(titleFlashTimer)
  titleFlashTimer = null
  if (typeof document !== 'undefined') document.title = ORIGINAL_TITLE
  titleFlashCleanup?.()
  titleFlashCleanup = null
}

/** Parpadea el título de la pestaña hasta que el usuario vuelva (o pasen 2 min). */
function startTitleFlash() {
  if (typeof document === 'undefined' || titleFlashTimer) return
  let on = false
  titleFlashTimer = setInterval(() => {
    document.title = on ? ORIGINAL_TITLE : '⏰ ¡Sesión completa! — FocusOne'
    on = !on
  }, 1200)
  const onVisible = () => { if (!document.hidden) stopTitleFlash() }
  document.addEventListener('visibilitychange', onVisible)
  titleFlashCleanup = () => document.removeEventListener('visibilitychange', onVisible)
  setTimeout(stopTitleFlash, 120_000)
}

/** Se llama al completar una sesión de Deep Work de forma natural. */
export function notifySessionComplete(minutes: number) {
  playChime()
  if (typeof document === 'undefined' || !document.hidden) return

  startTitleFlash()
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification('¡Sesión de Deep Work completada!', {
        body: `${minutes} minutos de foco profundo. Vuelve a FocusOne para tu próximo paso.`,
        icon: '/icon.svg',
        tag: 'focusone-deep-work',
      })
    } catch {
      // Algunos navegadores restringen Notification fuera de un service worker.
    }
  }
}
