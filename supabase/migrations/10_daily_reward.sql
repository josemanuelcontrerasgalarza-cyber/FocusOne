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

-- Reclamar la recompensa del día. Devuelve el monto reclamado.
create or replace function public.claim_daily()
returns integer as $$
declare
  v_streak integer;
  v_amount integer;
begin
  if exists (
    select 1 from public.daily_claims
    where user_id = auth.uid() and claim_date = current_date
  ) then
    raise exception 'Ya reclamaste tu recompensa de hoy';
  end if;

  select coalesce(streak_current, 0) into v_streak
    from public.profiles where id = auth.uid();

  -- Base 20 + hasta 15 según la racha (premia la constancia).
  v_amount := 20 + least(coalesce(v_streak, 0), 15);

  insert into public.daily_claims (user_id, claim_date, amount)
    values (auth.uid(), current_date, v_amount);

  insert into public.points (user_id, total_points)
    values (auth.uid(), v_amount)
    on conflict (user_id)
    do update set total_points = public.points.total_points + v_amount,
                  updated_at = now();

  return v_amount;
end;
$$ language plpgsql security definer;

-- Estado del reclamo de HOY calculado en el servidor (evita el bug de zona
-- horaria de comparar fechas en el cliente): ¿ya reclamó hoy? y ¿cuánto vale?
create or replace function public.daily_claim_state()
returns table(claimed boolean, amount integer) as $$
declare
  v_streak integer;
begin
  select coalesce(streak_current, 0) into v_streak
    from public.profiles where id = auth.uid();
  return query select
    exists(
      select 1 from public.daily_claims
      where user_id = auth.uid() and claim_date = current_date
    ),
    20 + least(coalesce(v_streak, 0), 15);
end;
$$ language plpgsql security definer;
