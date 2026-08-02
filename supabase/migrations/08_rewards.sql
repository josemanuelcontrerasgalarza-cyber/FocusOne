-- Migración "La Fragua": tienda de recompensas (Fase 6)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Modelo: catálogo `rewards` + pivote `reward_unlocks` (user_id, reward_id).
-- Elegimos pivote en vez de un array `unlocked_by` por integridad relacional,
-- RLS por usuario y ausencia de carreras al mutar arrays. El desbloqueo resta
-- puntos mediante una RPC SECURITY DEFINER (el cliente no escribe points).

-- ============================================================================
-- 1. Catálogo
-- ============================================================================
create table if not exists public.rewards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  type        text not null check (type in ('playlist', 'theme', 'badge')),
  cost_points integer not null check (cost_points >= 0),
  icon        text,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 2. Pivote de desbloqueos
-- ============================================================================
create table if not exists public.reward_unlocks (
  user_id     uuid not null references auth.users (id) on delete cascade,
  reward_id   uuid not null references public.rewards (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);

-- ============================================================================
-- 3. RLS
-- ============================================================================
-- El catálogo es público (solo lectura). Nadie inserta recompensas desde el
-- cliente (sin política de insert → RLS lo deniega por defecto).
alter table public.rewards enable row level security;
drop policy if exists "rewards_select_all" on public.rewards;
create policy "rewards_select_all" on public.rewards for select using (true);

alter table public.reward_unlocks enable row level security;
drop policy if exists "unlocks_select_own" on public.reward_unlocks;
create policy "unlocks_select_own" on public.reward_unlocks
  for select using (auth.uid() = user_id);

-- El cliente no escribe desbloqueos directamente: solo la RPC (SECURITY DEFINER).
revoke insert, update, delete on public.reward_unlocks from authenticated, anon;

-- ============================================================================
-- 4. Desbloquear (atómico: valida puntos, resta y registra)
-- ============================================================================
create or replace function public.unlock_reward(p_reward uuid)
returns integer as $$  -- devuelve el nuevo total de puntos
declare
  v_cost  integer;
  v_total integer;
begin
  select cost_points into v_cost from public.rewards where id = p_reward;
  if v_cost is null then
    raise exception 'La recompensa no existe';
  end if;

  if exists (
    select 1 from public.reward_unlocks
    where user_id = auth.uid() and reward_id = p_reward
  ) then
    raise exception 'Recompensa ya desbloqueada';
  end if;

  select total_points into v_total from public.points where user_id = auth.uid();
  v_total := coalesce(v_total, 0);
  if v_total < v_cost then
    raise exception 'Puntos insuficientes';
  end if;

  update public.points
    set total_points = total_points - v_cost, updated_at = now()
    where user_id = auth.uid();

  insert into public.reward_unlocks (user_id, reward_id)
    values (auth.uid(), p_reward);

  return v_total - v_cost;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 5. Catálogo inicial (idempotente por nombre)
-- ============================================================================
insert into public.rewards (name, description, type, cost_points, icon)
select * from (values
  ('Playlist Synthwave', 'Una frecuencia extra para tus sprints', 'playlist', 50, '🎧'),
  ('Playlist Lluvia',    'Ruido blanco para foco profundo',       'playlist', 40, '🌧️'),
  ('Tema Medianoche',    'Canvas aún más oscuro',                 'theme',    80, '🌑'),
  ('Tema Brasa',         'Skin ember intensificada',              'theme',   120, '🔥'),
  ('Insignia Herrero',   'Distintivo por tu constancia',          'badge',   200, '🛠️'),
  ('Insignia Racha 30',  'Para forjadores implacables',           'badge',   300, '🏅')
) as v(name, description, type, cost_points, icon)
where not exists (select 1 from public.rewards r where r.name = v.name);
