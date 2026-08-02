-- Migración "La Fragua": tienda de recompensas (v2)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- El catálogo vive en el CÓDIGO (src/lib/rewardsCatalog.ts) → siempre visible
-- sin seed. La BD solo guarda qué desbloqueó el usuario (reward_unlocks).
-- Desbloquear gasta puntos vía RPC SECURITY DEFINER; el COSTO lo valida el
-- servidor, no el cliente.

-- ============================================================================
-- 1. Desbloqueos (clave de texto = id del catálogo en código)
-- ============================================================================
create table if not exists public.reward_unlocks (
  user_id     uuid not null references auth.users (id) on delete cascade,
  reward_id   text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);

-- ============================================================================
-- 2. RLS — cada usuario ve solo sus desbloqueos; escribir solo por la RPC
-- ============================================================================
alter table public.reward_unlocks enable row level security;
drop policy if exists "unlocks_select_own" on public.reward_unlocks;
create policy "unlocks_select_own" on public.reward_unlocks
  for select using (auth.uid() = user_id);
revoke insert, update, delete on public.reward_unlocks from authenticated, anon;

-- ============================================================================
-- 3. Desbloquear (el COSTO lo decide el servidor)
-- ============================================================================
create or replace function public.unlock_reward(p_reward text)
returns integer as $$  -- devuelve el nuevo total de puntos
declare
  v_cost  integer;
  v_total integer;
begin
  v_cost := case p_reward
    when 'pl-lluvia'    then 40
    when 'pl-synthwave' then 50
    when 'th-medianoche' then 80
    when 'th-brasa'     then 120
    when 'bd-herrero'   then 200
    when 'bd-racha30'   then 300
    else null
  end;

  if v_cost is null then
    raise exception 'Recompensa desconocida: %', p_reward;
  end if;

  if exists (
    select 1 from public.reward_unlocks where user_id = auth.uid() and reward_id = p_reward
  ) then
    raise exception 'Recompensa ya desbloqueada';
  end if;

  select total_points into v_total from public.points where user_id = auth.uid() for update;
  v_total := coalesce(v_total, 0);
  if v_total < v_cost then
    raise exception 'Puntos insuficientes';
  end if;

  update public.points
    set total_points = total_points - v_cost, updated_at = now()
    where user_id = auth.uid();

  insert into public.reward_unlocks (user_id, reward_id) values (auth.uid(), p_reward);
  return v_total - v_cost;
end;
$$ language plpgsql security definer;
