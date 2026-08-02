-- Migración "La Fragua": cola de notificaciones físicas para el ESP32
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Cada evento de enfoque completado inserta una fila. El ESP32 hace polling y
-- consume las filas con consumida=false para mover el servo. Sin esta tabla, la
-- notificación física nunca dispara (el insert del cliente es best-effort).

create table if not exists public.notificaciones_esp32 (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tipo       text not null,
  consumida  boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notificaciones_esp32_pendientes_idx
  on public.notificaciones_esp32 (usuario_id, consumida, created_at);

alter table public.notificaciones_esp32 enable row level security;

drop policy if exists "esp32_select_own" on public.notificaciones_esp32;
create policy "esp32_select_own" on public.notificaciones_esp32
  for select using (auth.uid() = usuario_id);

drop policy if exists "esp32_insert_own" on public.notificaciones_esp32;
create policy "esp32_insert_own" on public.notificaciones_esp32
  for insert with check (auth.uid() = usuario_id);
