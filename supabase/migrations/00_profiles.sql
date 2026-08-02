-- Migración BASE "La Fragua": perfiles (autocontenida, solo depende de auth.users)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- La racha de La Fragua se guarda en columnas de `profiles`. SIN esta tabla,
-- forjar una misión (trigger de racha) y reclamar diamantes (claim_daily) fallan.

create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text unique not null,
  name               text,
  avatar_url         text,
  streak_current     integer default 0,
  streak_best        integer default 0,
  streak_last_date   date,
  created_at         timestamptz default now()
);

-- Por si la tabla ya existía de una versión vieja sin las columnas de racha.
alter table public.profiles add column if not exists streak_current   integer default 0;
alter table public.profiles add column if not exists streak_best      integer default 0;
alter table public.profiles add column if not exists streak_last_date date;

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- El usuario puede actualizar su propio nombre/email/avatar (p.ej. al pasar
-- de cuenta demo a cuenta real en upgradeAccount), pero SOLO esas columnas:
-- streak_current/streak_best/streak_last_date quedan fuera del grant para que
-- nadie pueda falsificar su racha escribiendo directo a profiles. Esos campos
-- los escribe únicamente el trigger SECURITY DEFINER de la racha.
revoke update on public.profiles from authenticated;
grant update (email, name, avatar_url) on public.profiles to authenticated;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Alta automática del perfil al registrarse un usuario nuevo.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@focusone.local'),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill de usuarios que ya existían antes de este setup.
insert into public.profiles (id, email)
select id, coalesce(email, id::text || '@focusone.local')
from auth.users
on conflict (id) do nothing;
