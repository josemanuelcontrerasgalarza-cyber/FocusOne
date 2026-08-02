-- Migración v2.3 — versiona `notificaciones_esp32` (Pulse).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Esta tabla la usa `src/lib/notificarESP32.ts` desde hace varias fases pero
-- nunca se migró: vivía creada a mano en el dashboard de Supabase, sin RLS
-- versionado ni auditable. Si no tenía política `with check (auth.uid() =
-- usuario_id)`, cualquier usuario autenticado podía insertar una fila con el
-- `usuario_id` de otra persona desde devtools y disparar su servo físico.
-- Esta migración la trae al repo y cierra ese hueco (create table if not
-- exists no toca una tabla ya existente, pero enable RLS + las políticas sí
-- se aplican siempre).

create table if not exists public.notificaciones_esp32 (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.profiles(id) on delete cascade,
  tipo         text not null check (
    tipo in ('pomodoro_completado', 'deep_work_completado', 'tarea_completada', 'mision_completada')
  ),
  consumida    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notificaciones_esp32_polling_idx
  on public.notificaciones_esp32 (usuario_id, consumida);

alter table public.notificaciones_esp32 enable row level security;

-- Cada usuario (o su ESP32, autenticado con su propia sesión) solo puede
-- crear, leer y marcar como consumidas SUS PROPIAS notificaciones.
drop policy if exists "notificaciones_esp32_own" on public.notificaciones_esp32;
create policy "notificaciones_esp32_own" on public.notificaciones_esp32
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
