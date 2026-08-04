-- FocusOne · La Fragua — Setup de base de datos (robusto)
-- Pega TODO esto en Supabase -> SQL Editor -> New query -> Run. Es idempotente.
-- Solo incluye lo de La Fragua (autocontenido): perfiles, misiones, puntos+quiz,
-- racha, recompensas, Focus Pet, recompensa diaria, ESP32 y opiniones.
-- No depende de tablas viejas (tasks/projects).

-- ==================================================================
-- 00_profiles.sql  (BASE — imprescindible: racha y recompensa diaria la usan)
-- ==================================================================
-- La Fragua guarda la racha en columnas de `profiles`. Esta tabla solo depende
-- de auth.users, así que es autocontenida. SIN esta tabla, forjar una misión y
-- reclamar diamantes fallan (el trigger de racha y claim_daily leen profiles).

create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text unique not null,
  name               text,
  avatar_url         text,
  streak_current     integer default 0,
  streak_best        integer default 0,
  streak_last_date   date,
  is_developer       boolean not null default false,
  created_at         timestamptz default now()
);

-- Por si la tabla ya existía de una versión vieja sin las columnas de racha.
alter table public.profiles add column if not exists streak_current   integer default 0;
alter table public.profiles add column if not exists streak_best      integer default 0;
alter table public.profiles add column if not exists streak_last_date date;
-- Rol de desarrollador: diamantes ilimitados y todo desbloqueado (ver más abajo).
alter table public.profiles add column if not exists is_developer boolean not null default false;

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
-- La racha y is_developer los escribe el servidor (trigger / SQL admin), NUNCA
-- el cliente: profiles no tiene policy de UPDATE, así nadie se auto-asigna dev.

-- ¿La cuenta actual es de desarrollador? SECURITY DEFINER para poder leer el
-- flag desde las RPC de economía sin depender de la RLS del que llama.
create or replace function public.is_dev()
returns boolean as $$
  select coalesce((select is_developer from public.profiles where id = auth.uid()), false);
$$ language sql security definer set search_path = public stable;

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
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill: crea el perfil de los usuarios que YA existían antes de este setup
-- (si no, su racha nunca se guardaría porque el UPDATE no encontraría fila).
insert into public.profiles (id, email)
select id, coalesce(email, id::text || '@focusone.local')
from auth.users
on conflict (id) do nothing;

-- ==================================================================
-- 04_missions.sql
-- ==================================================================
-- Migración v2.2 — "La Fragua": misiones (Fase 2/3)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Modelo de la misión protagonista. La regla "una sola misión activa por
-- usuario" se valida en el BACKEND con un índice único parcial (no solo en la
-- UI), tal como exige la Fase 3.

-- ============================================================================
-- 1. TABLA missions
-- ============================================================================
create table if not exists public.missions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 200),
  project           text,
  estimated_minutes integer not null default 25 check (estimated_minutes between 1 and 600),
  status            text not null default 'pending' check (status in ('pending', 'active', 'completed')),
  source            text not null default 'user' check (source in ('user', 'ai')),
  created_at        timestamptz not null default now(),
  completed_at      timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists missions_user_status_idx
  on public.missions (user_id, status, created_at desc);

-- Regla de negocio: como MÁXIMO una misión 'active' por usuario.
-- El índice único parcial la impone a nivel de base de datos: activar una
-- segunda misión falla con violación de unicidad → lo capturamos en el cliente.
create unique index if not exists missions_one_active_per_user_idx
  on public.missions (user_id)
  where status = 'active';

-- ============================================================================
-- 2. updated_at automático
-- ============================================================================
create or replace function public.touch_missions_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists on_missions_touch on public.missions;
create trigger on_missions_touch
  before update on public.missions
  for each row execute procedure public.touch_missions_updated_at();

-- Sella completed_at cuando la misión pasa a 'completed'.
create or replace function public.handle_mission_completed()
returns trigger as $$
begin
  if NEW.status = 'completed' and OLD.status is distinct from 'completed' then
    NEW.completed_at := coalesce(NEW.completed_at, now());
  end if;
  return NEW;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists on_mission_completed on public.missions;
create trigger on_mission_completed
  before update on public.missions
  for each row execute procedure public.handle_mission_completed();

-- ============================================================================
-- 3. RLS — cada usuario solo ve y edita sus propias misiones
-- ============================================================================
alter table public.missions enable row level security;

drop policy if exists "missions_select_own" on public.missions;
create policy "missions_select_own" on public.missions
  for select using (auth.uid() = user_id);

drop policy if exists "missions_insert_own" on public.missions;
create policy "missions_insert_own" on public.missions
  for insert with check (auth.uid() = user_id);

drop policy if exists "missions_update_own" on public.missions;
create policy "missions_update_own" on public.missions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "missions_delete_own" on public.missions;
create policy "missions_delete_own" on public.missions
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- 4. ACTIVAR MISIÓN (atómico, validado en el backend)
--    Apaga cualquier otra misión activa del usuario y enciende la elegida en
--    una sola transacción. Impone "una sola activa" en el servidor, no solo
--    en la UI. SECURITY DEFINER + comprobación explícita de auth.uid().
-- ============================================================================
create or replace function public.activate_mission(p_mission uuid)
returns void as $$
begin
  -- Solo el dueño puede activar su misión.
  if not exists (
    select 1 from public.missions
    where id = p_mission and user_id = auth.uid()
  ) then
    raise exception 'Mission % no existe o no pertenece al usuario', p_mission;
  end if;

  -- Apaga la activa anterior (si la hay). Al quedar 0 activas antes de
  -- encender la nueva, no se viola el índice único parcial.
  update public.missions
    set status = 'pending'
    where user_id = auth.uid() and status = 'active' and id <> p_mission;

  -- Enciende la elegida (a menos que ya esté forjada).
  update public.missions
    set status = 'active'
    where id = p_mission and user_id = auth.uid() and status <> 'completed';
end;
$$ language plpgsql security definer set search_path = public;

-- ==================================================================
-- 06_quiz_points.sql
-- ==================================================================
-- Migración "La Fragua": quiz de cierre + puntos (Fase 4)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Modelo de puntos: points.total_points (agregado) + quiz_results (ledger).
-- No usamos una tabla de transacciones aparte porque quiz_results YA es el
-- historial de eventos que otorgan puntos (points_earned + completed_at).
-- Los puntos se calculan en el SERVIDOR desde el score y el total lo mantiene
-- un trigger SECURITY DEFINER → el cliente no puede falsificarlos.

-- ============================================================================
-- 1. quiz_results (ledger de cierres)
-- ============================================================================
create table if not exists public.quiz_results (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  mission_id     uuid not null references public.missions (id) on delete cascade,
  questions_json jsonb not null default '[]'::jsonb,
  score          integer not null check (score between 0 and 100),
  points_earned  integer not null default 0,
  completed_at   timestamptz not null default now()
);

create index if not exists quiz_results_user_idx
  on public.quiz_results (user_id, completed_at desc);

-- Un solo cierre por misión: si el cliente reintenta el guardado, el segundo
-- insert falla y NO se otorgan puntos dos veces por la misma misión.
create unique index if not exists quiz_results_mission_unique
  on public.quiz_results (mission_id);

-- ============================================================================
-- 2. points (total agregado por usuario)
-- ============================================================================
create table if not exists public.points (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  total_points integer not null default 0,
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- 3. Cálculo de puntos EN EL SERVIDOR (el cliente solo envía score)
--    10 base por cerrar la misión + hasta 10 según el score (0..100).
-- ============================================================================
create or replace function public.compute_quiz_points()
returns trigger as $$
begin
  new.points_earned := 10 + (new.score / 10);
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists on_quiz_compute_points on public.quiz_results;
create trigger on_quiz_compute_points
  before insert on public.quiz_results
  for each row execute procedure public.compute_quiz_points();

-- Suma al total. SECURITY DEFINER para poder escribir en points aunque el
-- cliente no tenga permiso de escritura directa sobre esa tabla.
create or replace function public.apply_quiz_points()
returns trigger as $$
begin
  insert into public.points (user_id, total_points)
  values (new.user_id, new.points_earned)
  on conflict (user_id)
  do update set total_points = public.points.total_points + new.points_earned,
                updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_quiz_apply_points on public.quiz_results;
create trigger on_quiz_apply_points
  after insert on public.quiz_results
  for each row execute procedure public.apply_quiz_points();

-- ============================================================================
-- 4. RLS
-- ============================================================================
alter table public.quiz_results enable row level security;

drop policy if exists "quiz_select_own" on public.quiz_results;
create policy "quiz_select_own" on public.quiz_results
  for select using (auth.uid() = user_id);

-- Solo puede cerrar una misión propia que esté ACTIVA (encendida). Sin el
-- filtro por estado se podían crear misiones y postear quiz_results en bucle
-- para farmear puntos sin trabajo real de enfoque.
drop policy if exists "quiz_insert_own" on public.quiz_results;
create policy "quiz_insert_own" on public.quiz_results
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.missions m
      where m.id = mission_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );

alter table public.points enable row level security;

drop policy if exists "points_select_own" on public.points;
create policy "points_select_own" on public.points
  for select using (auth.uid() = user_id);

-- El cliente NO escribe puntos: solo el trigger (SECURITY DEFINER) lo hace.
revoke insert, update, delete on public.points from authenticated, anon;

-- Cierre de misión con SCORE calculado EN EL SERVIDOR. Antes el cliente enviaba
-- `score` a quiz_results (podía inflarlo). Ahora manda solo los índices de
-- opción elegidos y el score se computa aquí con pesos fijos (espejo de
-- MOCK_QUESTIONS en src/lib/quiz.ts). Bloqueamos el insert directo del cliente.
revoke insert on public.quiz_results from authenticated, anon;

create or replace function public.close_mission(p_mission uuid, p_answers int[])
returns table(score integer, points_earned integer) as $$
declare
  -- Pesos 0..1 por opción de cada pregunta (misma tabla que el cliente).
  v_weights numeric[] := array[
    1.0, 0.6, 0.3,   -- q1
    1.0, 0.6, 0.2,   -- q2
    1.0, 0.5, 0.2,   -- q3
    1.0, 0.5, 0.1    -- q4
  ];
  v_sum   numeric := 0;
  v_idx   int;
  v_score int;
  v_pts   int;
  i       int;
begin
  -- Reintento idempotente: si el cierre YA existe, devuelve su resultado sin
  -- error (aunque la misión ya no esté 'active' porque se completó antes).
  select qr.score, qr.points_earned into v_score, v_pts
    from public.quiz_results qr
    where qr.mission_id = p_mission and qr.user_id = auth.uid();
  if found then
    return query select v_score, coalesce(v_pts, 0);
    return;
  end if;

  -- Primer cierre: debe ser una misión propia y ACTIVA (encendida).
  if not exists (
    select 1 from public.missions
    where id = p_mission and user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Misión no válida o no está activa';
  end if;

  -- Score = promedio de los pesos de las opciones elegidas × 100. Índices fuera
  -- de rango cuentan como la peor opción (evita trampas con índices raros).
  for i in 1..4 loop
    v_idx := coalesce(p_answers[i], 2);            -- 0..2 (0-based)
    if v_idx < 0 or v_idx > 2 then v_idx := 2; end if;
    v_sum := v_sum + v_weights[(i - 1) * 3 + v_idx + 1];
  end loop;
  v_score := round((v_sum / 4.0) * 100);

  -- Inserta el cierre (idempotente por el índice único de mission_id). Los
  -- triggers compute/apply_quiz_points calculan y suman los puntos.
  insert into public.quiz_results (user_id, mission_id, questions_json, score)
    values (auth.uid(), p_mission, '[]'::jsonb, v_score)
    on conflict (mission_id) do nothing;

  select qr.points_earned into v_pts
    from public.quiz_results qr where qr.mission_id = p_mission;

  -- Marca la misión como forjada (si no lo estaba ya).
  update public.missions set status = 'completed'
    where id = p_mission and user_id = auth.uid() and status <> 'completed';

  return query select v_score, coalesce(v_pts, 0);
end;
$$ language plpgsql security definer set search_path = public;

-- ==================================================================
-- 07_mission_streak.sql
-- ==================================================================
-- Migración "La Fragua": racha al forjar misiones (Fase 5)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- La racha se calcula EN EL SERVIDOR (trigger SECURITY DEFINER), reutilizando
-- las columnas de racha que ya viven en profiles (streak_current/best/last_date).
-- Misma lógica guardada por fecha que las tareas: completar varias misiones el
-- mismo día NO infla la racha; un día sin completar nada la reinicia.

create or replace function public.handle_mission_streak()
returns trigger as $$
declare
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_streak integer;
  v_best integer;
  v_last date;
  v_new integer;
begin
  if NEW.status = 'completed' and OLD.status is distinct from 'completed' then
    select streak_current, streak_best, streak_last_date
      into v_streak, v_best, v_last
      from public.profiles
      where id = NEW.user_id;

    if v_last = v_today then
      v_new := coalesce(v_streak, 0);            -- ya contó hoy
    elsif v_last = v_yesterday then
      v_new := coalesce(v_streak, 0) + 1;        -- racha continúa
    else
      v_new := 1;                                -- racha reinicia
    end if;

    update public.profiles set
      streak_current   = v_new,
      streak_best      = greatest(v_new, coalesce(v_best, 0)),
      streak_last_date = v_today
    where id = NEW.user_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_mission_streak on public.missions;
create trigger on_mission_streak
  after update on public.missions
  for each row execute procedure public.handle_mission_streak();

-- ==================================================================
-- 08_rewards.sql
-- ==================================================================
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

  -- Developer: desbloquea gratis y sin errores (idempotente), puntos ilimitados.
  if public.is_dev() then
    insert into public.reward_unlocks (user_id, reward_id)
      values (auth.uid(), p_reward)
      on conflict do nothing;
    return 999999;
  end if;

  if exists (
    select 1 from public.reward_unlocks where user_id = auth.uid() and reward_id = p_reward
  ) then
    raise exception 'Recompensa ya desbloqueada';
  end if;

  -- FOR UPDATE bloquea la fila de puntos: dos compras simultáneas no pueden
  -- pasar ambas la validación de saldo y dejar el total en negativo.
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
$$ language plpgsql security definer set search_path = public;

-- ==================================================================
-- 09_focus_pet.sql
-- ==================================================================
-- Migración "La Fragua × Focus Pet": mascota de enfoque (v2)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- El catálogo (mascotas + ropa) vive en el CÓDIGO (src/lib/petCatalog.ts), así
-- que siempre se ve sin seed. La base de datos solo guarda: qué posee el
-- usuario (pet_owned) y su mascota activa/equipada (user_pet). Comprar gasta
-- puntos vía RPC SECURITY DEFINER; el COSTO lo valida el servidor (no el
-- cliente). Equipar es cosmético y gratis (update de la fila propia).

-- ============================================================================
-- 1. Ítems que posee el usuario (clave de texto = id del catálogo en código)
-- ============================================================================
create table if not exists public.pet_owned (
  user_id     uuid not null references auth.users (id) on delete cascade,
  item_id     text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- ============================================================================
-- 2. Mascota activa + slots equipados (claves de texto)
-- ============================================================================
create table if not exists public.user_pet (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  name         text not null default 'Ascua',
  pet_id       text,
  hat_id       text,
  outfit_id    text,
  accessory_id text,
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- 3. RLS
-- ============================================================================
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

-- Anti-trampa: solo se pueden equipar ítems que el usuario POSEE (pet_owned).
-- Sin esto, el cliente podía escribir directamente user_pet y lucir cosméticos
-- de pago sin gastar puntos vía buy_pet_item. Cada slot no nulo debe estar en
-- pet_owned (incluidas las mascotas gratis, que también generan fila al adoptar).
create or replace function public.enforce_pet_ownership()
returns trigger as $$
declare
  v_slot text;
begin
  -- Developer: equipa lo que quiera sin validar posesión.
  if public.is_dev() then
    return NEW;
  end if;

  foreach v_slot in array array[NEW.pet_id, NEW.hat_id, NEW.outfit_id, NEW.accessory_id]
  loop
    -- Las mascotas base son gratis y siempre equipables (no rompe cuentas previas).
    if v_slot is not null and v_slot not in ('gato', 'perro') and not exists (
      select 1 from public.pet_owned
      where user_id = NEW.user_id and item_id = v_slot
    ) then
      raise exception 'No posees el ítem "%": cómpralo antes de equiparlo', v_slot;
    end if;
  end loop;
  return NEW;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists on_user_pet_ownership on public.user_pet;
create trigger on_user_pet_ownership
  before insert or update on public.user_pet
  for each row execute procedure public.enforce_pet_ownership();

-- ============================================================================
-- 4. Comprar un ítem (el COSTO lo decide el servidor, no el cliente)
-- ============================================================================
create or replace function public.buy_pet_item(p_item text)
returns integer as $$  -- devuelve el nuevo total de puntos
declare
  v_cost  integer;
  v_total integer;
begin
  v_cost := case p_item
    when 'gato'    then 0
    when 'perro'   then 0
    when 'zorro'   then 80
    when 'buho'    then 120
    when 'dragon'  then 300
    when 'gorro'   then 30
    when 'corona'  then 150
    when 'bufanda' then 40
    when 'capa'    then 120
    when 'gafas'   then 25
    when 'medalla' then 60
    else null
  end;

  if v_cost is null then
    raise exception 'Ítem desconocido: %', p_item;
  end if;

  -- Developer: compra gratis y sin errores (idempotente), puntos ilimitados.
  if public.is_dev() then
    insert into public.pet_owned (user_id, item_id)
      values (auth.uid(), p_item)
      on conflict do nothing;
    return 999999;
  end if;

  if exists (
    select 1 from public.pet_owned where user_id = auth.uid() and item_id = p_item
  ) then
    raise exception 'Ya tienes este ítem';
  end if;

  -- FOR UPDATE bloquea la fila: evita doble-gasto en compras concurrentes.
  select total_points into v_total from public.points where user_id = auth.uid() for update;
  v_total := coalesce(v_total, 0);
  if v_total < v_cost then
    raise exception 'Puntos insuficientes';
  end if;

  if v_cost > 0 then
    update public.points
      set total_points = total_points - v_cost, updated_at = now()
      where user_id = auth.uid();
  end if;

  insert into public.pet_owned (user_id, item_id) values (auth.uid(), p_item);
  return v_total - v_cost;
end;
$$ language plpgsql security definer set search_path = public;

-- ==================================================================
-- TIENDA (catálogo amplio de ítems + compra genérica)
-- ==================================================================
-- store_items es la fuente de verdad del COSTO (el cliente no lo decide). El
-- catálogo se siembra desde src/lib/storeCatalog.ts (mismo listado en código).
create table if not exists public.store_items (
  id    text primary key,
  name  text not null,
  kind  text not null,
  emoji text not null,
  cost  integer not null default 0
);
alter table public.store_items enable row level security;
drop policy if exists "store_items_read" on public.store_items;
create policy "store_items_read" on public.store_items for select using (true);
grant select on public.store_items to anon, authenticated;
revoke insert, update, delete on public.store_items from anon, authenticated;

-- Seed de store_items (generado, 558 ítems).
insert into public.store_items (id, name, kind, emoji, cost) values
  ('gato','Gato','pet','🐱',0),
  ('perro','Perro','pet','🐶',0),
  ('zorro','Zorro','pet','🦊',80),
  ('buho','Búho','pet','🦉',120),
  ('dragon','Dragón','pet','🐉',300),
  ('gorro','Sombrero de copa','hat','🎩',30),
  ('corona','Corona','hat','👑',150),
  ('bufanda','Bufanda','outfit','🧣',40),
  ('capa','Capa de héroe','outfit','🦸',120),
  ('gafas','Gafas de sol','accessory','🕶️',25),
  ('medalla','Medalla','accessory','🏅',60),
  ('pet-0','Conejo','pet','🐰',0),
  ('pet-1','Hámster','pet','🐹',0),
  ('pet-2','Ratón','pet','🐭',20),
  ('pet-3','Oso','pet','🐻',40),
  ('pet-4','Panda','pet','🐼',40),
  ('pet-5','Koala','pet','🐨',40),
  ('pet-6','Tigre','pet','🐯',60),
  ('pet-7','León','pet','🦁',60),
  ('pet-8','Vaca','pet','🐮',60),
  ('pet-9','Cerdito','pet','🐷',90),
  ('pet-10','Rana','pet','🐸',90),
  ('pet-11','Mono','pet','🐵',90),
  ('pet-12','Gallina','pet','🐔',120),
  ('pet-13','Pingüino','pet','🐧',120),
  ('pet-14','Pájaro','pet','🐦',120),
  ('pet-15','Pato','pet','🦆',160),
  ('pet-16','Águila','pet','🦅',160),
  ('pet-17','Murciélago','pet','🦇',160),
  ('pet-18','Lobo','pet','🐺',220),
  ('pet-19','Jabalí','pet','🐗',220),
  ('pet-20','Caballo','pet','🐴',220),
  ('pet-21','Unicornio','pet','🦄',300),
  ('pet-22','Abeja','pet','🐝',300),
  ('pet-23','Mariposa','pet','🦋',300),
  ('pet-24','Caracol','pet','🐌',400),
  ('pet-25','Mariquita','pet','🐞',400),
  ('pet-26','Tortuga','pet','🐢',400),
  ('pet-27','Serpiente','pet','🐍',400),
  ('pet-28','Lagarto','pet','🦎',400),
  ('pet-29','Pulpo','pet','🐙',400),
  ('pet-30','Calamar','pet','🦑',400),
  ('pet-31','Cangrejo','pet','🦀',400),
  ('pet-32','Langosta','pet','🦞',400),
  ('pet-33','Pez tropical','pet','🐠',400),
  ('pet-34','Pececito','pet','🐟',400),
  ('pet-35','Pez globo','pet','🐡',400),
  ('pet-36','Delfín','pet','🐬',400),
  ('pet-37','Ballena','pet','🐳',400),
  ('pet-38','Ballena azul','pet','🐋',400),
  ('pet-39','Tiburón','pet','🦈',400),
  ('pet-40','Leopardo','pet','🐆',400),
  ('pet-41','Tigre de Bengala','pet','🐅',400),
  ('pet-42','Cebra','pet','🦓',400),
  ('pet-43','Gorila','pet','🦍',400),
  ('pet-44','Elefante','pet','🐘',400),
  ('pet-45','Hipopótamo','pet','🦛',400),
  ('pet-46','Rinoceronte','pet','🦏',400),
  ('pet-47','Dromedario','pet','🐪',400),
  ('pet-48','Camello','pet','🐫',400),
  ('pet-49','Jirafa','pet','🦒',400),
  ('pet-50','Canguro','pet','🦘',400),
  ('pet-51','Toro','pet','🐂',400),
  ('pet-52','Vaca lechera','pet','🐄',400),
  ('pet-53','Corcel','pet','🐎',400),
  ('pet-54','Cochinillo','pet','🐖',400),
  ('pet-55','Carnero','pet','🐏',400),
  ('pet-56','Oveja','pet','🐑',400),
  ('pet-57','Llama','pet','🦙',400),
  ('pet-58','Cabra','pet','🐐',400),
  ('pet-59','Ciervo','pet','🦌',400),
  ('pet-60','Caniche','pet','🐩',400),
  ('pet-61','Mapache','pet','🦝',400),
  ('pet-62','Mofeta','pet','🦨',400),
  ('pet-63','Tejón','pet','🦡',400),
  ('pet-64','Nutria','pet','🦦',400),
  ('pet-65','Perezoso','pet','🦥',400),
  ('pet-66','Ardilla','pet','🐿️',400),
  ('pet-67','Erizo','pet','🦔',400),
  ('pet-68','Pavo real','pet','🦚',400),
  ('pet-69','Loro','pet','🦜',400),
  ('pet-70','Cisne','pet','🦢',400),
  ('pet-71','Flamenco','pet','🦩',400),
  ('pet-72','Paloma','pet','🕊️',400),
  ('pet-73','Conejito','pet','🐇',400),
  ('hat-0','Birrete','hat','🎓',20),
  ('hat-1','Casco de rescate','hat','⛑️',20),
  ('hat-2','Casco militar','hat','🪖',20),
  ('hat-3','Gorra','hat','🧢',40),
  ('hat-4','Pamela','hat','👒',40),
  ('hat-5','Calabaza','hat','🎃',40),
  ('hat-6','Antiparras','hat','🥽',60),
  ('hat-7','Lazo','hat','🎀',60),
  ('hat-8','Alien','hat','👽',60),
  ('hat-9','Robot','hat','🤖',90),
  ('hat-10','Cerebro','hat','🧠',90),
  ('hat-11','Flor de cerezo','hat','🌸',90),
  ('hat-12','Hibisco','hat','🌺',120),
  ('hat-13','Girasol','hat','🌻',120),
  ('hat-14','Seta','hat','🍄',120),
  ('hat-15','Estrella','hat','⭐',160),
  ('hat-16','Destellos','hat','✨',160),
  ('hat-17','Estrella fugaz','hat','💫',160),
  ('hat-18','Llama','hat','🔥',220),
  ('hat-19','Copo de nieve','hat','❄️',220),
  ('hat-20','Aureola','hat','😇',220),
  ('hat-21','Querubín','hat','👼',300),
  ('hat-22','Mago','hat','🧙',300),
  ('hat-23','Vampiro','hat','🧛',300),
  ('hat-24','Sirena','hat','🧜',400),
  ('hat-25','Hada','hat','🧚',400),
  ('hat-26','Tengu','hat','👺',400),
  ('hat-27','Ogro','hat','👹',400),
  ('hat-28','Vaquero','hat','🤠',400),
  ('hat-29','Ninja','hat','🥷',400),
  ('hat-30','Papá Noel','hat','🎅',400),
  ('hat-31','Mamá Noel','hat','🤶',400),
  ('outfit-0','Bata','outfit','🥼',20),
  ('outfit-1','Kimono','outfit','🥋',20),
  ('outfit-2','Corbata','outfit','👔',20),
  ('outfit-3','Camiseta','outfit','👕',40),
  ('outfit-4','Vestido','outfit','👗',40),
  ('outfit-5','Kimono floral','outfit','👘',40),
  ('outfit-6','Sari','outfit','🥻',60),
  ('outfit-7','Bañador','outfit','🩱',60),
  ('outfit-8','Bikini','outfit','👙',60),
  ('outfit-9','Blusa','outfit','👚',90),
  ('outfit-10','Abrigo','outfit','🧥',90),
  ('outfit-11','Pantalón corto','outfit','🩳',90),
  ('outfit-12','Vaqueros','outfit','👖',120),
  ('outfit-13','Atletismo','outfit','🎽',120),
  ('outfit-14','Chaleco','outfit','🦺',120),
  ('outfit-15','Calcetines','outfit','🧦',160),
  ('outfit-16','Ropa interior','outfit','🩲',160),
  ('outfit-17','Monedero','outfit','👛',160),
  ('outfit-18','Bolso','outfit','👜',220),
  ('outfit-19','Mochila','outfit','🎒',220),
  ('outfit-20','Guantes','outfit','🧤',220),
  ('outfit-21','Arcoíris','outfit','🌈',300),
  ('outfit-22','Escudo novato','outfit','🔰',300),
  ('outfit-23','Roseta','outfit','🏵️',300),
  ('accessory-0','Gafas','accessory','👓',20),
  ('accessory-1','Oro','accessory','🥇',20),
  ('accessory-2','Plata','accessory','🥈',20),
  ('accessory-3','Bronce','accessory','🥉',40),
  ('accessory-4','Anillo','accessory','💍',40),
  ('accessory-5','Collar','accessory','📿',40),
  ('accessory-6','Diamante','accessory','💎',60),
  ('accessory-7','Bola de cristal','accessory','🔮',60),
  ('accessory-8','Reloj','accessory','⌚',60),
  ('accessory-9','Móvil','accessory','📱',90),
  ('accessory-10','Auriculares','accessory','🎧',90),
  ('accessory-11','Mando','accessory','🎮',90),
  ('accessory-12','Joystick','accessory','🕹️',120),
  ('accessory-13','Dado','accessory','🎲',120),
  ('accessory-14','Comodín','accessory','🃏',120),
  ('accessory-15','Diana','accessory','🎯',160),
  ('accessory-16','Varita mágica','accessory','🪄',160),
  ('accessory-17','Daga','accessory','🗡️',160),
  ('accessory-18','Escudo','accessory','🛡️',220),
  ('accessory-19','Espadas','accessory','⚔️',220),
  ('accessory-20','Arco','accessory','🏹',220),
  ('accessory-21','Tridente','accessory','🔱',300),
  ('accessory-22','Flor de lis','accessory','⚜️',300),
  ('accessory-23','Condecoración','accessory','🎖️',300),
  ('aura-0','Estrella brillante','aura','🌟',20),
  ('aura-1','Explosión','aura','💥',20),
  ('aura-2','Rayo','aura','⚡',20),
  ('aura-3','Ola','aura','🌊',40),
  ('aura-4','Ráfaga','aura','💨',40),
  ('aura-5','Espiral','aura','🌀',40),
  ('aura-6','Tornado','aura','🌪️',60),
  ('aura-7','Burbujas','aura','🫧',60),
  ('aura-8','Gota','aura','💧',60),
  ('aura-9','Gota carmesí','aura','🩸',90),
  ('aura-10','Cometa','aura','☄️',90),
  ('aura-11','Deseo estelar','aura','🌠',90),
  ('aura-12','Fuegos artificiales','aura','🎆',120),
  ('aura-13','Bengala','aura','🎇',120),
  ('aura-14','Vela','aura','🕯️',120),
  ('aura-15','Rombo','aura','💠',160),
  ('aura-16','Brillo intenso','aura','🔆',160),
  ('aura-17','Brillo tenue','aura','🔅',160),
  ('aura-18','Vapor','aura','♨️',220),
  ('fondo-0','Volcán','fondo','🌋',20),
  ('fondo-1','Montaña nevada','fondo','🏔️',20),
  ('fondo-2','Montaña','fondo','⛰️',20),
  ('fondo-3','Vía Láctea','fondo','🌌',40),
  ('fondo-4','Parque natural','fondo','🏞️',40),
  ('fondo-5','Desierto','fondo','🏜️',40),
  ('fondo-6','Atardecer urbano','fondo','🌇',60),
  ('fondo-7','Ciudad al anochecer','fondo','🌆',60),
  ('fondo-8','Skyline','fondo','🏙️',60),
  ('fondo-9','Noche estrellada','fondo','🌃',90),
  ('fondo-10','Puente nocturno','fondo','🌉',90),
  ('fondo-11','Isla','fondo','🏝️',90),
  ('fondo-12','Campamento','fondo','🏕️',120),
  ('fondo-13','Castillo','fondo','🏰',120),
  ('fondo-14','Castillo japonés','fondo','🏯',120),
  ('fondo-15','Torre','fondo','🗼',160),
  ('fondo-16','Amanecer','fondo','🌅',160),
  ('fondo-17','Alba en montaña','fondo','🌄',160),
  ('fondo-18','Niebla','fondo','🌁',220),
  ('fondo-19','Planeta','fondo','🪐',220),
  ('fondo-20','Planeta Tierra','fondo','🌏',220),
  ('fondo-21','Luna','fondo','🌙',300),
  ('insignia-0','Trofeo','insignia','🏆',20),
  ('insignia-1','Cien puntos','insignia','💯',20),
  ('insignia-2','Lazo conmemorativo','insignia','🎗️',20),
  ('insignia-3','Picas','insignia','♠️',40),
  ('insignia-4','Corazones','insignia','♥️',40),
  ('insignia-5','Diamantes','insignia','♦️',40),
  ('insignia-6','Tréboles','insignia','♣️',60),
  ('insignia-7','Dragón rojo','insignia','🀄',60),
  ('insignia-8','Yin y yang','insignia','☯️',60),
  ('insignia-9','Om','insignia','🕉️',90),
  ('insignia-10','Cruz','insignia','✝️',90),
  ('insignia-11','Media luna','insignia','☪️',90),
  ('insignia-12','Estrella de seis puntas','insignia','🔯',120),
  ('insignia-13','Lugar de culto','insignia','🛐',120),
  ('insignia-14','Átomo','insignia','⚛️',120),
  ('comida-0','Manzana','comida','🍎',20),
  ('comida-1','Pizza','comida','🍕',20),
  ('comida-2','Hamburguesa','comida','🍔',20),
  ('comida-3','Papas fritas','comida','🍟',40),
  ('comida-4','Perrito caliente','comida','🌭',40),
  ('comida-5','Palomitas','comida','🍿',40),
  ('comida-6','Sal','comida','🧂',60),
  ('comida-7','Tocino','comida','🥓',60),
  ('comida-8','Panqueques','comida','🥞',60),
  ('comida-9','Gofre','comida','🧇',90),
  ('comida-10','Huevo frito','comida','🍳',90),
  ('comida-11','Huevo','comida','🥚',90),
  ('comida-12','Queso','comida','🧀',120),
  ('comida-13','Pretzel','comida','🥨',120),
  ('comida-14','Cruasán','comida','🥐',120),
  ('comida-15','Baguette','comida','🥖',160),
  ('comida-16','Pan','comida','🍞',160),
  ('comida-17','Rosca','comida','🥯',160),
  ('comida-18','Ramen','comida','🍜',220),
  ('comida-19','Guiso','comida','🍲',220),
  ('comida-20','Curry','comida','🍛',220),
  ('comida-21','Langostino','comida','🍤',300),
  ('comida-22','Onigiri','comida','🍙',300),
  ('comida-23','Arroz','comida','🍚',300),
  ('comida-24','Galleta de arroz','comida','🍘',400),
  ('comida-25','Oden','comida','🍢',400),
  ('comida-26','Dango','comida','🍡',400),
  ('comida-27','Raspado','comida','🍧',400),
  ('comida-28','Helado','comida','🍨',400),
  ('comida-29','Cucurucho','comida','🍦',400),
  ('comida-30','Tarta','comida','🥧',400),
  ('comida-31','Magdalena','comida','🧁',400),
  ('comida-32','Pastel','comida','🍰',400),
  ('comida-33','Tarta de cumpleaños','comida','🎂',400),
  ('comida-34','Flan','comida','🍮',400),
  ('comida-35','Piruleta','comida','🍭',400),
  ('comida-36','Caramelo','comida','🍬',400),
  ('comida-37','Chocolate','comida','🍫',400),
  ('comida-38','Dona','comida','🍩',400),
  ('comida-39','Galleta','comida','🍪',400),
  ('comida-40','Castaña','comida','🌰',400),
  ('comida-41','Cacahuete','comida','🥜',400),
  ('comida-42','Miel','comida','🍯',400),
  ('comida-43','Leche','comida','🥛',400),
  ('comida-44','Café','comida','☕',400),
  ('comida-45','Té','comida','🍵',400),
  ('comida-46','Zumo','comida','🧃',400),
  ('comida-47','Refresco','comida','🥤',400),
  ('comida-48','Té de burbujas','comida','🧋',400),
  ('comida-49','Cerveza','comida','🍺',400),
  ('comida-50','Vino','comida','🍷',400),
  ('comida-51','Brindis','comida','🥂',400),
  ('comida-52','Cóctel','comida','🍸',400),
  ('comida-53','Tropical','comida','🍹',400),
  ('comida-54','Taco','comida','🌮',400),
  ('comida-55','Burrito','comida','🌯',400),
  ('comida-56','Tamal','comida','🫔',400),
  ('comida-57','Pita','comida','🥙',400),
  ('comida-58','Falafel','comida','🧆',400),
  ('comida-59','Sushi','comida','🍣',400),
  ('comida-60','Bento','comida','🍱',400),
  ('comida-61','Uvas','comida','🍇',400),
  ('comida-62','Melón','comida','🍈',400),
  ('comida-63','Sandía','comida','🍉',400),
  ('comida-64','Naranja','comida','🍊',400),
  ('comida-65','Limón','comida','🍋',400),
  ('comida-66','Plátano','comida','🍌',400),
  ('comida-67','Piña','comida','🍍',400),
  ('comida-68','Mango','comida','🥭',400),
  ('comida-69','Pera','comida','🍐',400),
  ('comida-70','Melocotón','comida','🍑',400),
  ('comida-71','Cerezas','comida','🍒',400),
  ('comida-72','Fresa','comida','🍓',400),
  ('comida-73','Arándanos','comida','🫐',400),
  ('comida-74','Kiwi','comida','🥝',400),
  ('comida-75','Tomate','comida','🍅',400),
  ('comida-76','Aceituna','comida','🫒',400),
  ('comida-77','Coco','comida','🥥',400),
  ('comida-78','Aguacate','comida','🥑',400),
  ('comida-79','Berenjena','comida','🍆',400),
  ('comida-80','Patata','comida','🥔',400),
  ('comida-81','Zanahoria','comida','🥕',400),
  ('comida-82','Maíz','comida','🌽',400),
  ('comida-83','Chile','comida','🌶️',400),
  ('comida-84','Pimiento','comida','🫑',400),
  ('comida-85','Pepino','comida','🥒',400),
  ('comida-86','Lechuga','comida','🥬',400),
  ('comida-87','Brócoli','comida','🥦',400),
  ('comida-88','Ajo','comida','🧄',400),
  ('comida-89','Cebolla','comida','🧅',400),
  ('planta-0','Brote','planta','🌱',20),
  ('planta-1','Hierba','planta','🌿',20),
  ('planta-2','Trébol','planta','🍀',20),
  ('planta-3','Espiga','planta','🌾',40),
  ('planta-4','Cactus','planta','🌵',40),
  ('planta-5','Palmera','planta','🌴',40),
  ('planta-6','Pino','planta','🌲',60),
  ('planta-7','Árbol','planta','🌳',60),
  ('planta-8','Tanabata','planta','🎋',60),
  ('planta-9','Bambú','planta','🎍',90),
  ('planta-10','Hoja de arce','planta','🍁',90),
  ('planta-11','Hojas secas','planta','🍂',90),
  ('planta-12','Hojas al viento','planta','🍃',120),
  ('planta-13','Tulipán','planta','🌷',120),
  ('planta-14','Rosa','planta','🌹',120),
  ('planta-15','Rosa marchita','planta','🥀',160),
  ('planta-16','Margarita','planta','🌼',160),
  ('planta-17','Ramo','planta','💐',160),
  ('planta-18','Maceta','planta','🪴',220),
  ('deporte-0','Fútbol','deporte','⚽',20),
  ('deporte-1','Baloncesto','deporte','🏀',20),
  ('deporte-2','Fútbol americano','deporte','🏈',20),
  ('deporte-3','Béisbol','deporte','⚾',40),
  ('deporte-4','Softbol','deporte','🥎',40),
  ('deporte-5','Tenis','deporte','🎾',40),
  ('deporte-6','Voleibol','deporte','🏐',60),
  ('deporte-7','Rugby','deporte','🏉',60),
  ('deporte-8','Disco volador','deporte','🥏',60),
  ('deporte-9','Billar','deporte','🎱',90),
  ('deporte-10','Yoyó','deporte','🪀',90),
  ('deporte-11','Ping-pong','deporte','🏓',90),
  ('deporte-12','Bádminton','deporte','🏸',120),
  ('deporte-13','Portería','deporte','🥅',120),
  ('deporte-14','Hockey','deporte','🏒',120),
  ('deporte-15','Hockey hierba','deporte','🏑',160),
  ('deporte-16','Lacrosse','deporte','🥍',160),
  ('deporte-17','Críquet','deporte','🏏',160),
  ('deporte-18','Bumerán','deporte','🪃',220),
  ('deporte-19','Boxeo','deporte','🥊',220),
  ('deporte-20','Monopatín','deporte','🛹',220),
  ('deporte-21','Patines','deporte','🛼',300),
  ('deporte-22','Trineo','deporte','🛷',300),
  ('deporte-23','Patinaje','deporte','⛸️',300),
  ('deporte-24','Curling','deporte','🥌',400),
  ('deporte-25','Esquí','deporte','🎿',400),
  ('deporte-26','Esquiador','deporte','⛷️',400),
  ('deporte-27','Snowboard','deporte','🏂',400),
  ('deporte-28','Pesas','deporte','🏋️',400),
  ('deporte-29','Lucha','deporte','🤼',400),
  ('deporte-30','Gimnasia','deporte','🤸',400),
  ('deporte-31','Esgrima','deporte','🤺',400),
  ('deporte-32','Balonmano','deporte','🤾',400),
  ('deporte-33','Golf','deporte','🏌️',400),
  ('deporte-34','Hípica','deporte','🏇',400),
  ('deporte-35','Yoga','deporte','🧘',400),
  ('deporte-36','Surf','deporte','🏄',400),
  ('deporte-37','Natación','deporte','🏊',400),
  ('deporte-38','Waterpolo','deporte','🤽',400),
  ('deporte-39','Remo','deporte','🚣',400),
  ('deporte-40','Escalada','deporte','🧗',400),
  ('deporte-41','Ciclismo de montaña','deporte','🚵',400),
  ('deporte-42','Ciclismo','deporte','🚴',400),
  ('musica-0','Nota musical','musica','🎵',20),
  ('musica-1','Melodía','musica','🎶',20),
  ('musica-2','Partitura','musica','🎼',20),
  ('musica-3','Micrófono','musica','🎤',40),
  ('musica-4','Saxofón','musica','🎷',40),
  ('musica-5','Guitarra','musica','🎸',40),
  ('musica-6','Piano','musica','🎹',60),
  ('musica-7','Trompeta','musica','🎺',60),
  ('musica-8','Violín','musica','🎻',60),
  ('musica-9','Banjo','musica','🪕',90),
  ('musica-10','Batería','musica','🥁',90),
  ('musica-11','Tambor','musica','🪘',90),
  ('musica-12','Corneta','musica','📯',120),
  ('musica-13','Micrófono de estudio','musica','🎙️',120),
  ('musica-14','Ecualizador','musica','🎚️',120),
  ('musica-15','Mesa de mezclas','musica','🎛️',160),
  ('objeto-0','Bombilla','objeto','💡',20),
  ('objeto-1','Linterna','objeto','🔦',20),
  ('objeto-2','Lámpara de aceite','objeto','🪔',20),
  ('objeto-3','Llave inglesa','objeto','🔧',40),
  ('objeto-4','Martillo','objeto','🔨',40),
  ('objeto-5','Martillo y pico','objeto','⚒️',40),
  ('objeto-6','Herramientas','objeto','🛠️',60),
  ('objeto-7','Pico','objeto','⛏️',60),
  ('objeto-8','Tornillo','objeto','🔩',60),
  ('objeto-9','Engranaje','objeto','⚙️',90),
  ('objeto-10','Caja de herramientas','objeto','🧰',90),
  ('objeto-11','Imán','objeto','🧲',90),
  ('objeto-12','Pistola de agua','objeto','🔫',120),
  ('objeto-13','Bomba','objeto','💣',120),
  ('objeto-14','Petardo','objeto','🧨',120),
  ('objeto-15','Hacha','objeto','🪓',160),
  ('objeto-16','Cuchillo','objeto','🔪',160),
  ('objeto-17','Humo','objeto','🚬',160),
  ('objeto-18','Ataúd','objeto','⚰️',220),
  ('objeto-19','Urna','objeto','⚱️',220),
  ('objeto-20','Ánfora','objeto','🏺',220),
  ('objeto-21','Ojo turco','objeto','🧿',300),
  ('objeto-22','Barbería','objeto','💈',300),
  ('objeto-23','Alambique','objeto','⚗️',300),
  ('objeto-24','Telescopio','objeto','🔭',400),
  ('objeto-25','Microscopio','objeto','🔬',400),
  ('objeto-26','Agujero','objeto','🕳️',400),
  ('objeto-27','Pastilla','objeto','💊',400),
  ('objeto-28','Jeringa','objeto','💉',400),
  ('objeto-29','ADN','objeto','🧬',400),
  ('objeto-30','Microbio','objeto','🦠',400),
  ('objeto-31','Placa Petri','objeto','🧫',400),
  ('objeto-32','Probeta','objeto','🧪',400),
  ('objeto-33','Termómetro','objeto','🌡️',400),
  ('objeto-34','Escoba','objeto','🧹',400),
  ('objeto-35','Cesta','objeto','🧺',400),
  ('objeto-36','Papel','objeto','🧻',400),
  ('objeto-37','Campanilla','objeto','🛎️',400),
  ('objeto-38','Llave','objeto','🔑',400),
  ('objeto-39','Llave antigua','objeto','🗝️',400),
  ('objeto-40','Puerta','objeto','🚪',400),
  ('objeto-41','Silla','objeto','🪑',400),
  ('objeto-42','Sofá','objeto','🛋️',400),
  ('objeto-43','Cama','objeto','🛏️',400),
  ('objeto-44','Osito de peluche','objeto','🧸',400),
  ('objeto-45','Cuadro','objeto','🖼️',400),
  ('objeto-46','Espejo','objeto','🪞',400),
  ('objeto-47','Bolsas','objeto','🛍️',400),
  ('objeto-48','Carrito','objeto','🛒',400),
  ('objeto-49','Regalo','objeto','🎁',400),
  ('objeto-50','Globo','objeto','🎈',400),
  ('objeto-51','Banderines koi','objeto','🎏',400),
  ('objeto-52','Confeti','objeto','🎊',400),
  ('objeto-53','Fiesta','objeto','🎉',400),
  ('objeto-54','Piñata','objeto','🪅',400),
  ('objeto-55','Matrioska','objeto','🪆',400),
  ('objeto-56','Cámara','objeto','📷',400),
  ('objeto-57','Cámara con flash','objeto','📸',400),
  ('objeto-58','Videocámara','objeto','📹',400),
  ('objeto-59','Cinta','objeto','📼',400),
  ('objeto-60','Disquete','objeto','💾',400),
  ('objeto-61','CD','objeto','💿',400),
  ('objeto-62','DVD','objeto','📀',400),
  ('objeto-63','Ábaco','objeto','🧮',400),
  ('objeto-64','Libro rojo','objeto','📕',400),
  ('objeto-65','Libro verde','objeto','📗',400),
  ('objeto-66','Libro azul','objeto','📘',400),
  ('objeto-67','Libro naranja','objeto','📙',400),
  ('objeto-68','Libros','objeto','📚',400),
  ('objeto-69','Libro abierto','objeto','📖',400),
  ('vehiculo-0','Coche','vehiculo','🚗',20),
  ('vehiculo-1','Taxi','vehiculo','🚕',20),
  ('vehiculo-2','Todoterreno','vehiculo','🚙',20),
  ('vehiculo-3','Autobús','vehiculo','🚌',40),
  ('vehiculo-4','Trolebús','vehiculo','🚎',40),
  ('vehiculo-5','Bólido','vehiculo','🏎️',40),
  ('vehiculo-6','Coche de policía','vehiculo','🚓',60),
  ('vehiculo-7','Ambulancia','vehiculo','🚑',60),
  ('vehiculo-8','Camión de bomberos','vehiculo','🚒',60),
  ('vehiculo-9','Furgoneta','vehiculo','🚐',90),
  ('vehiculo-10','Camión','vehiculo','🚚',90),
  ('vehiculo-11','Tráiler','vehiculo','🚛',90),
  ('vehiculo-12','Tractor','vehiculo','🚜',120),
  ('vehiculo-13','Pickup','vehiculo','🛻',120),
  ('vehiculo-14','Moto','vehiculo','🏍️',120),
  ('vehiculo-15','Scooter','vehiculo','🛵',160),
  ('vehiculo-16','Bicicleta','vehiculo','🚲',160),
  ('vehiculo-17','Patinete','vehiculo','🛴',160),
  ('vehiculo-18','Sirena','vehiculo','🚨',220),
  ('vehiculo-19','Patrulla','vehiculo','🚔',220),
  ('vehiculo-20','Autobús que llega','vehiculo','🚍',220),
  ('vehiculo-21','Coche que llega','vehiculo','🚘',300),
  ('vehiculo-22','Taxi que llega','vehiculo','🚖',300),
  ('vehiculo-23','Teleférico','vehiculo','🚡',300),
  ('vehiculo-24','Funicular','vehiculo','🚠',400),
  ('vehiculo-25','Monorraíl suspendido','vehiculo','🚟',400),
  ('vehiculo-26','Vagón','vehiculo','🚃',400),
  ('vehiculo-27','Tranvía','vehiculo','🚋',400),
  ('vehiculo-28','Tren de montaña','vehiculo','🚞',400),
  ('vehiculo-29','Monorraíl','vehiculo','🚝',400),
  ('vehiculo-30','Tren bala','vehiculo','🚄',400),
  ('vehiculo-31','AVE','vehiculo','🚅',400),
  ('vehiculo-32','Tren ligero','vehiculo','🚈',400),
  ('vehiculo-33','Locomotora','vehiculo','🚂',400),
  ('vehiculo-34','Tren','vehiculo','🚆',400),
  ('vehiculo-35','Metro','vehiculo','🚇',400),
  ('vehiculo-36','Tranvía moderno','vehiculo','🚊',400),
  ('vehiculo-37','Estación','vehiculo','🚉',400),
  ('vehiculo-38','Avión','vehiculo','✈️',400),
  ('vehiculo-39','Despegue','vehiculo','🛫',400),
  ('vehiculo-40','Avioneta','vehiculo','🛩️',400),
  ('vehiculo-41','Asiento','vehiculo','💺',400),
  ('vehiculo-42','Helicóptero','vehiculo','🚁',400),
  ('vehiculo-43','Cohete','vehiculo','🚀',400),
  ('vehiculo-44','Platillo volante','vehiculo','🛸',400),
  ('vehiculo-45','Satélite','vehiculo','🛰️',400),
  ('vehiculo-46','Velero','vehiculo','⛵',400),
  ('vehiculo-47','Lancha','vehiculo','🚤',400),
  ('vehiculo-48','Yate','vehiculo','🛥️',400),
  ('vehiculo-49','Crucero','vehiculo','🛳️',400),
  ('vehiculo-50','Ferry','vehiculo','⛴️',400),
  ('vehiculo-51','Barco','vehiculo','🚢',400),
  ('vehiculo-52','Ancla','vehiculo','⚓',400),
  ('vehiculo-53','Gasolinera','vehiculo','⛽',400),
  ('vehiculo-54','Semáforo','vehiculo','🚦',400),
  ('vehiculo-55','Semáforo horizontal','vehiculo','🚥',400),
  ('vehiculo-56','Mapa','vehiculo','🗺️',400),
  ('vehiculo-57','Moái','vehiculo','🗿',400),
  ('vehiculo-58','Estatua de la Libertad','vehiculo','🗽',400),
  ('vehiculo-59','Fuente','vehiculo','⛲',400),
  ('simbolo-0','Corazón rojo','simbolo','❤️',20),
  ('simbolo-1','Corazón naranja','simbolo','🧡',20),
  ('simbolo-2','Corazón amarillo','simbolo','💛',20),
  ('simbolo-3','Corazón verde','simbolo','💚',40),
  ('simbolo-4','Corazón azul','simbolo','💙',40),
  ('simbolo-5','Corazón morado','simbolo','💜',40),
  ('simbolo-6','Corazón negro','simbolo','🖤',60),
  ('simbolo-7','Corazón blanco','simbolo','🤍',60),
  ('simbolo-8','Corazón marrón','simbolo','🤎',60),
  ('simbolo-9','Corazón roto','simbolo','💔',90),
  ('simbolo-10','Corazón exclamación','simbolo','❣️',90),
  ('simbolo-11','Dos corazones','simbolo','💕',90),
  ('simbolo-12','Corazones giratorios','simbolo','💞',120),
  ('simbolo-13','Corazón latiente','simbolo','💓',120),
  ('simbolo-14','Corazón creciente','simbolo','💗',120),
  ('simbolo-15','Corazón brillante','simbolo','💖',160),
  ('simbolo-16','Flechazo','simbolo','💘',160),
  ('simbolo-17','Corazón con lazo','simbolo','💝',160),
  ('simbolo-18','Decoración de corazón','simbolo','💟',220),
  ('simbolo-19','Aries','simbolo','♈',220),
  ('simbolo-20','Tauro','simbolo','♉',220),
  ('simbolo-21','Géminis','simbolo','♊',300),
  ('simbolo-22','Cáncer','simbolo','♋',300),
  ('simbolo-23','Leo','simbolo','♌',300),
  ('simbolo-24','Virgo','simbolo','♍',400),
  ('simbolo-25','Libra','simbolo','♎',400),
  ('simbolo-26','Escorpio','simbolo','♏',400),
  ('simbolo-27','Sagitario','simbolo','♐',400),
  ('simbolo-28','Capricornio','simbolo','♑',400),
  ('simbolo-29','Acuario','simbolo','♒',400),
  ('simbolo-30','Piscis','simbolo','♓',400),
  ('simbolo-31','Reciclaje','simbolo','♻️',400),
  ('simbolo-32','Visto','simbolo','✅',400),
  ('simbolo-33','Destello','simbolo','✴️',400),
  ('simbolo-34','Chispa','simbolo','❇️',400),
  ('simbolo-35','Asterisco','simbolo','✳️',400),
  ('simbolo-36','Cruz verde','simbolo','❎',400),
  ('simbolo-37','Globo con meridianos','simbolo','🌐',400),
  ('simbolo-38','Zzz','simbolo','💤',400)
on conflict (id) do update set name = excluded.name, kind = excluded.kind, emoji = excluded.emoji, cost = excluded.cost;

create table if not exists public.store_owned (
  user_id     uuid not null references auth.users (id) on delete cascade,
  item_id     text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.store_owned enable row level security;
drop policy if exists "store_owned_read" on public.store_owned;
create policy "store_owned_read" on public.store_owned for select using (auth.uid() = user_id);
revoke insert, update, delete on public.store_owned from anon, authenticated;

-- Compra genérica: el COSTO lo decide el servidor (store_items). Para ítems
-- equipables también inserta pet_owned, así se pueden lucir en Focus Pet.
create or replace function public.buy_store_item(p_item text)
returns integer as $$
declare v_cost int; v_kind text; v_total int;
begin
  select cost, kind into v_cost, v_kind from public.store_items where id = p_item;
  if v_cost is null then raise exception 'Ítem desconocido: %', p_item; end if;

  if exists (select 1 from public.store_owned where user_id = auth.uid() and item_id = p_item) then
    if v_kind in ('pet','hat','outfit','accessory') then
      insert into public.pet_owned (user_id, item_id) values (auth.uid(), p_item) on conflict do nothing;
    end if;
    return coalesce((select total_points from public.points where user_id = auth.uid()), 0);
  end if;

  if public.is_dev() then
    v_cost := 0;
  else
    select total_points into v_total from public.points where user_id = auth.uid() for update;
    v_total := coalesce(v_total, 0);
    if v_total < v_cost then raise exception 'Puntos insuficientes'; end if;
  end if;

  if v_cost > 0 then
    update public.points set total_points = total_points - v_cost, updated_at = now()
      where user_id = auth.uid();
  end if;

  insert into public.store_owned (user_id, item_id) values (auth.uid(), p_item) on conflict do nothing;
  if v_kind in ('pet','hat','outfit','accessory') then
    insert into public.pet_owned (user_id, item_id) values (auth.uid(), p_item) on conflict do nothing;
  end if;

  return coalesce((select total_points from public.points where user_id = auth.uid()), 0);
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function public.buy_store_item(text) to authenticated;

-- Backfill: lo ya comprado en Focus Pet cuenta como poseído en la tienda.
insert into public.store_owned (user_id, item_id)
  select user_id, item_id from public.pet_owned
  on conflict do nothing;

-- ==================================================================
-- 10_daily_reward.sql
-- ==================================================================
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
  claimed_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);

-- Marca de tiempo del reclamo (para el tope real de 1 cada 20h). Idempotente.
alter table public.daily_claims add column if not exists claimed_at timestamptz not null default now();

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
  select coalesce(streak_current, 0) into v_streak
    from public.profiles where id = auth.uid();
  v_amount := 20 + least(coalesce(v_streak, 0), 15);

  -- Developer: reclama sin límite (ignora ventana, duplicado y tope de 20h).
  if public.is_dev() then
    insert into public.daily_claims (user_id, claim_date, amount)
      values (auth.uid(), p_local_date, v_amount)
      on conflict (user_id, claim_date) do update set claimed_at = now();
    insert into public.points (user_id, total_points)
      values (auth.uid(), v_amount)
      on conflict (user_id) do update
        set total_points = public.points.total_points + v_amount, updated_at = now();
    return v_amount;
  end if;

  -- Acota a ±1 día del servidor: cubre cualquier zona horaria (incluidas UTC+)
  -- pero impide reclamar fechas arbitrarias.
  if p_local_date < current_date - 1 or p_local_date > current_date + 1 then
    raise exception 'Fecha fuera de rango';
  end if;

  if exists (
    select 1 from public.daily_claims
    where user_id = auth.uid() and claim_date = p_local_date
  ) then
    raise exception 'Ya reclamaste tu recompensa de hoy';
  end if;

  -- Tope REAL anti-farm: máximo un reclamo por cada 20 horas, sin importar la
  -- fecha enviada. Evita reclamar ayer+hoy+mañana de golpe abusando de la ventana.
  if exists (
    select 1 from public.daily_claims
    where user_id = auth.uid() and claimed_at > now() - interval '20 hours'
  ) then
    raise exception 'Ya reclamaste tu recompensa de hoy';
  end if;

  -- v_amount (base 20 + hasta 15 por racha) ya se calculó al inicio.
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

-- ==================================================================
-- 05_reviews.sql
-- ==================================================================
-- Migración v4.1 — Opiniones anónimas públicas (landing).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Cualquiera (incluso sin cuenta) puede leer y publicar una opinión. El nombre
-- es opcional: si se deja vacío se muestra como "Anónimo".

create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  name text check (name is null or char_length(name) <= 80),
  rating int not null default 5 check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 1 and 500),
  created_at timestamptz default now()
);

-- Límite de longitud del nombre también para tablas ya existentes (idempotente).
alter table public.reviews drop constraint if exists reviews_name_len;
alter table public.reviews add constraint reviews_name_len
  check (name is null or char_length(name) <= 80);

create index if not exists reviews_created_idx on public.reviews(created_at desc);

alter table public.reviews enable row level security;

-- Lectura pública
drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews" on public.reviews
  for select using (true);

-- Publicación pública (con validación básica en la propia política)
-- El insert directo del cliente queda PROHIBIDO: publicar pasa por la RPC
-- post_review (SECURITY DEFINER) que aplica un rate-limit por IP. Así nadie
-- inunda la tabla llamando al endpoint REST en bucle con la clave anon pública.
drop policy if exists "Anyone can post a review" on public.reviews;
revoke insert on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;

-- Registro de publicaciones por IP (hasheada) para el rate-limit. Nunca es
-- legible por el cliente (sin policy de select + revoke): solo lo usa la RPC.
create table if not exists public.review_throttle (
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists review_throttle_idx on public.review_throttle (ip_hash, created_at desc);
alter table public.review_throttle enable row level security;
revoke all on public.review_throttle from anon, authenticated;

-- Publicar una reseña con límite: máx. 3 por IP cada hora. `p_ip_hash` lo
-- calcula el route handler del servidor (hash de la IP, nunca la IP en claro).
create or replace function public.post_review(
  p_name text,
  p_rating int,
  p_comment text,
  p_ip_hash text
)
returns public.reviews as $$
declare
  v_row public.reviews;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Valoración inválida';
  end if;
  if p_comment is null or char_length(trim(p_comment)) < 1 or char_length(p_comment) > 500 then
    raise exception 'Comentario inválido';
  end if;
  if p_name is not null and char_length(p_name) > 80 then
    raise exception 'Nombre demasiado largo';
  end if;

  -- Rate-limit: no más de 3 publicaciones por IP en la última hora.
  if (
    select count(*) from public.review_throttle
    where ip_hash = coalesce(p_ip_hash, 'unknown')
      and created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'Demasiadas opiniones desde tu conexión. Inténtalo más tarde.';
  end if;

  insert into public.reviews (name, rating, comment)
    values (nullif(trim(coalesce(p_name, '')), ''), p_rating, trim(p_comment))
    returning * into v_row;

  insert into public.review_throttle (ip_hash) values (coalesce(p_ip_hash, 'unknown'));
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.post_review(text, int, text, text) to anon, authenticated;

-- ==================================================================
-- 02b_focus_sessions.sql  (sesiones de Deep Work — versión autocontenida)
-- ==================================================================
-- Sin FK a tasks (la app inserta task_id = null): solo depende de auth.users.

create table if not exists public.focus_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  task_id         uuid,
  started_at      timestamptz not null,
  ended_at        timestamptz,
  planned_minutes integer not null default 25,
  completed       boolean not null default false,
  created_at      timestamptz default now()
);

create index if not exists focus_sessions_user_idx
  on public.focus_sessions (user_id, started_at desc);

alter table public.focus_sessions enable row level security;
drop policy if exists "Users manage own focus sessions" on public.focus_sessions;
create policy "Users manage own focus sessions" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ==================================================================
-- 11_esp32.sql  (notificaciones físicas — cola que consume el ESP32)
-- ==================================================================
-- Cada evento de enfoque completado inserta una fila. El ESP32 hace polling y
-- consume las filas con consumida=false para mover el servo. Sin esta tabla, la
-- notificación física simplemente nunca dispara (el insert es best-effort).

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

-- El usuario solo encola notificaciones propias.
drop policy if exists "esp32_insert_own" on public.notificaciones_esp32;
create policy "esp32_insert_own" on public.notificaciones_esp32
  for insert with check (auth.uid() = usuario_id);

-- ==================================================================
-- AMIGOS
-- ==================================================================
-- Relación de amistad (modelo espejo: dos filas por par). El cliente NO escribe
-- directamente: todo pasa por RPCs SECURITY DEFINER que validan auth.uid().
create table if not exists public.friendships (
  user_id      uuid not null references auth.users (id) on delete cascade,
  friend_id    uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  requested_by uuid not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, friend_id)
);
alter table public.friendships enable row level security;
drop policy if exists "friendships_read_own" on public.friendships;
create policy "friendships_read_own" on public.friendships for select using (auth.uid() = user_id);
revoke insert, update, delete on public.friendships from anon, authenticated;

-- Enviar solicitud por correo. Si el otro ya te la envió, se aceptan mutuamente.
create or replace function public.send_friend_request(p_email text)
returns text as $$
declare v_target uuid; v_me uuid := auth.uid();
begin
  select id into v_target from public.profiles where lower(email) = lower(trim(p_email));
  if v_target is null then raise exception 'No existe una cuenta con ese correo'; end if;
  if v_target = v_me then raise exception 'No puedes agregarte a ti mismo'; end if;
  if exists (select 1 from public.friendships where user_id = v_me and friend_id = v_target and status = 'accepted') then
    raise exception 'Ya son amigos';
  end if;
  if exists (select 1 from public.friendships where user_id = v_me and friend_id = v_target and status = 'pending' and requested_by = v_target) then
    update public.friendships set status = 'accepted'
      where (user_id, friend_id) in ((v_me, v_target), (v_target, v_me));
    return 'accepted';
  end if;
  insert into public.friendships (user_id, friend_id, status, requested_by) values
    (v_me, v_target, 'pending', v_me),
    (v_target, v_me, 'pending', v_me)
    on conflict (user_id, friend_id) do nothing;
  return 'sent';
end;
$$ language plpgsql security definer set search_path = public;

-- Aceptar (o rechazar) una solicitud entrante.
create or replace function public.respond_friend_request(p_from uuid, p_accept boolean)
returns void as $$
declare v_me uuid := auth.uid();
begin
  if not exists (select 1 from public.friendships where user_id = v_me and friend_id = p_from and status = 'pending' and requested_by = p_from) then
    raise exception 'No hay solicitud pendiente de esa persona';
  end if;
  if p_accept then
    update public.friendships set status = 'accepted'
      where (user_id, friend_id) in ((v_me, p_from), (p_from, v_me));
  else
    delete from public.friendships where (user_id, friend_id) in ((v_me, p_from), (p_from, v_me));
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Eliminar amistad (o cancelar solicitud enviada).
create or replace function public.remove_friend(p_friend uuid)
returns void as $$
declare v_me uuid := auth.uid();
begin
  delete from public.friendships where (user_id, friend_id) in ((v_me, p_friend), (p_friend, v_me));
end;
$$ language plpgsql security definer set search_path = public;

-- Amigos + solicitudes (con puntos y racha para el mini-ranking).
create or replace function public.list_friends()
returns jsonb as $$
declare v_me uuid := auth.uid();
begin
  return jsonb_build_object(
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'email', p.email,
        'points', coalesce(pt.total_points, 0), 'streak', coalesce(p.streak_current, 0))
        order by coalesce(pt.total_points, 0) desc)
      from public.friendships f
      join public.profiles p on p.id = f.friend_id
      left join public.points pt on pt.user_id = f.friend_id
      where f.user_id = v_me and f.status = 'accepted'), '[]'::jsonb),
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'email', p.email))
      from public.friendships f join public.profiles p on p.id = f.friend_id
      where f.user_id = v_me and f.status = 'pending' and f.requested_by = f.friend_id), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'email', p.email))
      from public.friendships f join public.profiles p on p.id = f.friend_id
      where f.user_id = v_me and f.status = 'pending' and f.requested_by = v_me), '[]'::jsonb)
  );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.send_friend_request(text)             to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid)                   to authenticated;
grant execute on function public.list_friends()                        to authenticated;

-- ==================================================================
-- HERRAMIENTAS DE DEVELOPER (panel in-app)
-- ==================================================================
-- RPCs solo para cuentas developer (is_dev()). Cualquier otra cuenta recibe
-- excepción. Se definen aquí, al final, porque referencian todas las tablas.

-- Resetea TODOS mis datos de prueba (misiones, puntos, mascota, reclamos...).
create or replace function public.dev_reset()
returns void as $$
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  delete from public.quiz_results  where user_id = auth.uid();
  delete from public.missions      where user_id = auth.uid();
  delete from public.reward_unlocks where user_id = auth.uid();
  delete from public.pet_owned     where user_id = auth.uid();
  delete from public.user_pet      where user_id = auth.uid();
  delete from public.daily_claims  where user_id = auth.uid();
  update public.points set total_points = 0, updated_at = now() where user_id = auth.uid();
  update public.profiles
    set streak_current = 0, streak_best = 0, streak_last_date = null
    where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

-- Suma (o resta) puntos para probar la economía.
create or replace function public.dev_add_points(p_amount int)
returns int as $$
declare v_total int;
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  insert into public.points (user_id, total_points)
    values (auth.uid(), greatest(coalesce(p_amount, 0), 0))
    on conflict (user_id) do update
      set total_points = greatest(public.points.total_points + p_amount, 0),
          updated_at = now()
    returning total_points into v_total;
  return v_total;
end;
$$ language plpgsql security definer set search_path = public;

-- Fija la racha a un valor (para probar el bono diario y las vistas).
create or replace function public.dev_set_streak(p_value int)
returns void as $$
declare v int := greatest(coalesce(p_value, 0), 0);
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  update public.profiles
    set streak_current = v,
        streak_best = greatest(streak_best, v),
        streak_last_date = current_date
    where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

-- Snapshot de TODOS mis datos (para la consola de developer).
create or replace function public.dev_snapshot()
returns jsonb as $$
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  return jsonb_build_object(
    'missions_total',     (select count(*) from public.missions where user_id = auth.uid()),
    'missions_active',    (select count(*) from public.missions where user_id = auth.uid() and status = 'active'),
    'missions_pending',   (select count(*) from public.missions where user_id = auth.uid() and status = 'pending'),
    'missions_completed', (select count(*) from public.missions where user_id = auth.uid() and status = 'completed'),
    'quiz_results',       (select count(*) from public.quiz_results where user_id = auth.uid()),
    'points',             (select coalesce(total_points, 0) from public.points where user_id = auth.uid()),
    'streak',             (select coalesce(streak_current, 0) from public.profiles where id = auth.uid()),
    'streak_best',        (select coalesce(streak_best, 0) from public.profiles where id = auth.uid()),
    'pets_owned',         (select count(*) from public.pet_owned where user_id = auth.uid()),
    'rewards_unlocked',   (select count(*) from public.reward_unlocks where user_id = auth.uid()),
    'daily_claims',       (select count(*) from public.daily_claims where user_id = auth.uid()),
    'focus_sessions',     (select count(*) from public.focus_sessions where user_id = auth.uid()),
    'is_developer',       true,
    'server_time',        now()
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Desbloquear TODO (todas las mascotas, ropa y recompensas del catálogo).
create or replace function public.dev_grant_all()
returns void as $$
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  -- Todos los ítems de la tienda.
  insert into public.store_owned (user_id, item_id)
    select auth.uid(), id from public.store_items on conflict do nothing;
  -- Los equipables, también en Focus Pet.
  insert into public.pet_owned (user_id, item_id)
    select auth.uid(), id from public.store_items where kind in ('pet','hat','outfit','accessory')
    on conflict do nothing;
  -- Todas las recompensas.
  insert into public.reward_unlocks (user_id, reward_id)
    select auth.uid(), x from unnest(array[
      'pl-lluvia','pl-synthwave','th-medianoche','th-brasa','bd-herrero','bd-racha30'
    ]) x
    on conflict do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- Fijar los puntos a un valor exacto.
create or replace function public.dev_set_points(p_value int)
returns int as $$
declare v int := greatest(coalesce(p_value, 0), 0);
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  insert into public.points (user_id, total_points) values (auth.uid(), v)
    on conflict (user_id) do update set total_points = v, updated_at = now();
  return v;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.dev_reset()          to authenticated;
grant execute on function public.dev_add_points(int)  to authenticated;
grant execute on function public.dev_set_streak(int)  to authenticated;
grant execute on function public.dev_snapshot()       to authenticated;
grant execute on function public.dev_grant_all()      to authenticated;
grant execute on function public.dev_set_points(int)  to authenticated;

-- ==================================================================
-- CUENTA DE DESARROLLADOR
-- ==================================================================
-- Marca una cuenta como developer: diamantes ilimitados, todo desbloqueado,
-- equipar sin comprar y reclamo diario sin límite. Solo se puede activar aquí
-- (SQL admin): el cliente no tiene policy de UPDATE sobre profiles, así que
-- nadie puede auto-asignarse el rol. Cambia el email para mover el rol de cuenta.
-- Si la cuenta aún no existe (sin registrar), no pasa nada: actualiza 0 filas;
-- registra ese correo y vuelve a ejecutar esta línea (o todo el script).
update public.profiles set is_developer = true  where email = 'kratos2704@outlook.es';
-- (Opcional) revocar a las demás cuentas para que solo esa sea developer:
update public.profiles set is_developer = false where email <> 'kratos2704@outlook.es';
