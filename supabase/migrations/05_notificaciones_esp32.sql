-- Migración v2.3 — Endurecimiento de seguridad: `notificaciones_esp32`
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- CONTEXTO (hallazgo de la auditoría semanal): `src/lib/notificarESP32.ts`
-- inserta en esta tabla desde hace varias semanas, pero nunca existió una
-- migración en el repo que la creara con RLS. Si la tabla se creó a mano
-- en el panel de Supabase, es muy probable que Row Level Security estuviera
-- desactivado por defecto — cualquier usuario autenticado podría entonces
-- leer o insertar notificaciones de OTROS usuarios (fuga de datos + spam
-- del servo físico ajeno). Esta migración crea la tabla si no existe y,
-- sobre todo, fuerza RLS y las políticas de propiedad aunque la tabla ya
-- exista con datos.

create table if not exists public.notificaciones_esp32 (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users (id) on delete cascade,
  tipo         text not null check (
    tipo in ('pomodoro_completado', 'deep_work_completado', 'tarea_completada', 'mision_completada')
  ),
  consumida    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notificaciones_esp32_pending_idx
  on public.notificaciones_esp32 (usuario_id, consumida, created_at);

-- RLS: cada usuario (o el ESP32 autenticado con su sesión) solo puede ver
-- y modificar sus propias notificaciones. Se aplica aunque la tabla ya
-- existiera sin RLS.
alter table public.notificaciones_esp32 enable row level security;

drop policy if exists "notificaciones_esp32_own" on public.notificaciones_esp32;
create policy "notificaciones_esp32_own" on public.notificaciones_esp32
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
