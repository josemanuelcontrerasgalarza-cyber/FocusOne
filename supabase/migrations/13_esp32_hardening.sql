-- Migración v5.5 — Hardening de notificaciones_esp32 (auditoría semanal 2026-08-04).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- NOTA: `supabase/setup_all.sql` es la fuente de verdad (contiene TODO junto y
-- ya incluye esto). Este archivo consolida el objeto nuevo por si aplicas las
-- migraciones una a una.
--
-- Hallazgo: `esp32_insert_own` deja insertar `tipo` con cualquier texto y sin
-- límite de volumen, a diferencia de todos los demás inserts de la app (que
-- van por RPC con validación + rate-limit). Riesgo bajo (solo escribe en sus
-- propias filas) pero permite ensuciar/inundar la cola de su propio ESP32.

alter table public.notificaciones_esp32
  drop constraint if exists notificaciones_esp32_tipo_check;
alter table public.notificaciones_esp32
  add constraint notificaciones_esp32_tipo_check
  check (tipo in ('pomodoro_completado', 'deep_work_completado', 'tarea_completada', 'mision_completada'));

create or replace function public.esp32_rate_limit()
returns trigger as $$
declare
  v_recientes int;
begin
  select count(*) into v_recientes
    from public.notificaciones_esp32
    where usuario_id = new.usuario_id
      and created_at > now() - interval '1 minute';
  if v_recientes >= 20 then
    raise exception 'Demasiadas notificaciones ESP32 en poco tiempo.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists esp32_rate_limit_trigger on public.notificaciones_esp32;
create trigger esp32_rate_limit_trigger
  before insert on public.notificaciones_esp32
  for each row execute function public.esp32_rate_limit();
