-- Hardening: `notificaciones_esp32.tipo` no tenía CHECK en la base de datos,
-- solo el tipo TS `TipoNotificacionESP32` lo restringía en el cliente. Como la
-- policy `esp32_insert_own` solo valida `usuario_id`, cualquier cuenta podía
-- insertar un `tipo` arbitrario vía REST con la anon key (spam en la cola de
-- polling del ESP32). Ejecutar en el SQL Editor de Supabase. Es idempotente.

alter table public.notificaciones_esp32
  drop constraint if exists notificaciones_esp32_tipo_check;

alter table public.notificaciones_esp32
  add constraint notificaciones_esp32_tipo_check
  check (tipo in ('pomodoro_completado', 'deep_work_completado', 'tarea_completada', 'mision_completada'));
