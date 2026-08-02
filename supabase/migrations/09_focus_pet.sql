-- Migración "La Fragua × Focus Pet": mascota de enfoque (motivación)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Compras (mascotas y accesorios) gastan puntos vía RPC SECURITY DEFINER
-- (no falsificable). Equipar es cosmético y gratis (update de la fila propia).

-- ============================================================================
-- 1. Catálogo de ítems (mascotas + ropa/accesorios)
-- ============================================================================
create table if not exists public.pet_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  kind        text not null check (kind in ('pet', 'hat', 'outfit', 'accessory')),
  cost_points integer not null check (cost_points >= 0),
  emoji       text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 2. Ítems que posee el usuario (pivote) — poblado solo por la RPC
-- ============================================================================
create table if not exists public.pet_owned (
  user_id     uuid not null references auth.users (id) on delete cascade,
  item_id     uuid not null references public.pet_items (id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- ============================================================================
-- 3. La mascota activa del usuario + slots equipados
-- ============================================================================
create table if not exists public.user_pet (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  name         text not null default 'Ascua',
  pet_id       uuid references public.pet_items (id),
  hat_id       uuid references public.pet_items (id),
  outfit_id    uuid references public.pet_items (id),
  accessory_id uuid references public.pet_items (id),
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- 4. RLS
-- ============================================================================
alter table public.pet_items enable row level security;
drop policy if exists "pet_items_read" on public.pet_items;
create policy "pet_items_read" on public.pet_items for select using (true);

alter table public.pet_owned enable row level security;
drop policy if exists "pet_owned_read" on public.pet_owned;
create policy "pet_owned_read" on public.pet_owned for select using (auth.uid() = user_id);
-- El cliente no escribe compras: solo la RPC (SECURITY DEFINER).
revoke insert, update, delete on public.pet_owned from authenticated, anon;

alter table public.user_pet enable row level security;
drop policy if exists "user_pet_read" on public.user_pet;
create policy "user_pet_read" on public.user_pet for select using (auth.uid() = user_id);
drop policy if exists "user_pet_insert" on public.user_pet;
create policy "user_pet_insert" on public.user_pet for insert with check (auth.uid() = user_id);
drop policy if exists "user_pet_update" on public.user_pet;
create policy "user_pet_update" on public.user_pet
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- 5. Comprar un ítem (resta puntos, registra propiedad)
-- ============================================================================
create or replace function public.buy_pet_item(p_item uuid)
returns integer as $$  -- devuelve el nuevo total de puntos
declare
  v_cost  integer;
  v_total integer;
begin
  select cost_points into v_cost from public.pet_items where id = p_item;
  if v_cost is null then
    raise exception 'El ítem no existe';
  end if;

  if exists (
    select 1 from public.pet_owned where user_id = auth.uid() and item_id = p_item
  ) then
    raise exception 'Ya tienes este ítem';
  end if;

  select total_points into v_total from public.points where user_id = auth.uid();
  v_total := coalesce(v_total, 0);
  if v_total < v_cost then
    raise exception 'Puntos insuficientes';
  end if;

  update public.points
    set total_points = total_points - v_cost, updated_at = now()
    where user_id = auth.uid();

  insert into public.pet_owned (user_id, item_id) values (auth.uid(), p_item);
  return v_total - v_cost;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 6. Catálogo inicial (idempotente por nombre)
--    Las dos primeras mascotas son gratis para empezar.
-- ============================================================================
insert into public.pet_items (name, kind, cost_points, emoji)
select * from (values
  ('Gato',     'pet',       0,   '🐱'),
  ('Perro',    'pet',       0,   '🐶'),
  ('Zorro',    'pet',       80,  '🦊'),
  ('Búho',     'pet',       120, '🦉'),
  ('Dragón',   'pet',       300, '🐉'),
  ('Gorro',    'hat',       30,  '🎩'),
  ('Corona',   'hat',       150, '👑'),
  ('Bufanda',  'outfit',    40,  '🧣'),
  ('Capa',     'outfit',    120, '🦸'),
  ('Gafas',    'accessory', 25,  '🕶️'),
  ('Medalla',  'accessory', 60,  '🏅')
) as v(name, kind, cost_points, emoji)
where not exists (select 1 from public.pet_items p where p.name = v.name);
