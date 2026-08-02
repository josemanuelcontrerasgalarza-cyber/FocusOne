-- Migración "La Fragua": recompensa diaria de diamantes (motivación)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- El usuario reclama diamantes (puntos) una vez al día. El monto lo calcula el
-- servidor (base + bono por racha) y se suma a points. Anti-doble-reclamo por
-- día con la PK (user_id, claim_date). SECURITY DEFINER: el cliente no escribe
-- puntos ni reclamos directamente.

create table if not exists public.daily_claims (
  user_id    uuid not null references auth.users (id) on delete cascade,
  claim_date date not null default current_date,
  amount     integer not null,
  primary key (user_id, claim_date)
);

alter table public.daily_claims enable row level security;
drop policy if exists "daily_claims_read" on public.daily_claims;
create policy "daily_claims_read" on public.daily_claims
  for select using (auth.uid() = user_id);
revoke insert, update, delete on public.daily_claims from authenticated, anon;

-- Reclamar la recompensa del día. `p_local_date` es la fecha LOCAL del cliente
-- (YYYY-MM-DD): así el día resetea a las 12:00 am de SU zona horaria y se puede
-- reclamar hasta las 11:59 pm de ese día. Sin argumento usa la fecha del server.
drop function if exists public.claim_daily();
create or replace function public.claim_daily(p_local_date date default current_date)
returns integer as $$
declare
  v_streak integer;
  v_amount integer;
begin
  -- Acota a ±1 día del servidor: cubre cualquier zona horaria pero impide
  -- reclamar fechas arbitrarias (anti-farm).
  if p_local_date < current_date - 1 or p_local_date > current_date + 1 then
    raise exception 'Fecha fuera de rango';
  end if;

  if exists (
    select 1 from public.daily_claims
    where user_id = auth.uid() and claim_date = p_local_date
  ) then
    raise exception 'Ya reclamaste tu recompensa de hoy';
  end if;

  select coalesce(streak_current, 0) into v_streak
    from public.profiles where id = auth.uid();

  -- Base 20 + hasta 15 según la racha (premia la constancia).
  v_amount := 20 + least(coalesce(v_streak, 0), 15);

  insert into public.daily_claims (user_id, claim_date, amount)
    values (auth.uid(), p_local_date, v_amount);

  insert into public.points (user_id, total_points)
    values (auth.uid(), v_amount)
    on conflict (user_id)
    do update set total_points = public.points.total_points + v_amount,
                  updated_at = now();

  return v_amount;
end;
$$ language plpgsql security definer set search_path = public;

-- Estado del reclamo del día LOCAL del cliente (evita el bug de zona horaria de
-- comparar fechas en el cliente): ¿ya reclamó hoy? y ¿cuánto vale?
drop function if exists public.daily_claim_state();
create or replace function public.daily_claim_state(p_local_date date default current_date)
returns table(claimed boolean, amount integer) as $$
declare
  v_streak integer;
begin
  select coalesce(streak_current, 0) into v_streak
    from public.profiles where id = auth.uid();
  return query select
    exists(
      select 1 from public.daily_claims
      where user_id = auth.uid() and claim_date = p_local_date
    ),
    20 + least(coalesce(v_streak, 0), 15);
end;
$$ language plpgsql security definer set search_path = public;
