import { supabase } from '@/lib/supabase'

/**
 * Tipos de evento que disparan la notificación física (servo) del ESP32.
 * El ESP32 hace polling cada 3s a `notificaciones_esp32` y consume las filas
 * con `consumida = false` — ese lado ya funciona y NO se toca desde aquí.
 */
export type TipoNotificacionESP32 =
  | 'pomodoro_completado'
  | 'deep_work_completado'
  | 'tarea_completada'
  | 'mision_completada'

/**
 * Inserta una fila en `notificaciones_esp32` para que el ESP32 mueva el servo.
 *
 * Fire-and-forget: captura cualquier error internamente y SOLO hace
 * console.error. Nunca lanza ni rompe el flujo principal de la app si la
 * notificación falla — completar la tarea/sesión/misión siempre gana.
 *
 * Uso recomendado sin bloquear la UI:  void notificarESP32(uid, 'tarea_completada')
 */
export async function notificarESP32(
  usuarioId: string,
  tipo: TipoNotificacionESP32,
): Promise<void> {
  if (!usuarioId) return
  try {
    const { error } = await supabase
      .from('notificaciones_esp32')
      .insert({ usuario_id: usuarioId, tipo })
    if (error) throw error
  } catch (err) {
    // La notificación física es best-effort: un fallo aquí no debe interrumpir
    // ni revertir la acción del usuario.
    console.error('[notificarESP32] no se pudo insertar la notificación:', err)
  }
}
