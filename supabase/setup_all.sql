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

-- El cliente puede actualizar SOLO su propia fila, y SOLO email/name/avatar_url
-- (columna concedida más abajo) — necesario para convertir cuenta demo en real
-- (upgradeAccount). La racha y is_developer los escribe el servidor (trigger /
-- SQL admin): esas columnas no están en el grant, así nadie se auto-asigna dev.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
revoke update on public.profiles from authenticated, anon;
grant update (email, name, avatar_url) on public.profiles to authenticated, anon;

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
  updated_at        timestamptz not null default now(),
  -- Pasos opcionales (2-8 sub-tareas cortas) para bajar la barrera de arranque
  -- en misiones grandes/vagas: [{ "label": string, "done": boolean }, ...]
  steps             jsonb not null default '[]'::jsonb
);

-- Por si la tabla ya existía de una versión previa sin esta columna.
alter table public.missions add column if not exists steps jsonb not null default '[]'::jsonb;
alter table public.missions drop constraint if exists missions_steps_len_check;
alter table public.missions add constraint missions_steps_len_check check (jsonb_array_length(steps) <= 8);

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

grant execute on function public.dev_reset()          to authenticated;
grant execute on function public.dev_add_points(int)  to authenticated;
grant execute on function public.dev_set_streak(int)  to authenticated;

-- ==================================================================
-- CUENTA DE DESARROLLADOR
-- ==================================================================
-- Marca una cuenta como developer: diamantes ilimitados, todo desbloqueado,
-- equipar sin comprar y reclamo diario sin límite. Solo se puede activar aquí
-- (SQL admin): is_developer no está en el grant de columnas del cliente, así
-- que nadie puede auto-asignarse el rol. Cambia el email para mover el rol de cuenta.
-- Si la cuenta aún no existe (sin registrar), no pasa nada: actualiza 0 filas;
-- registra ese correo y vuelve a ejecutar esta línea (o todo el script).
update public.profiles set is_developer = true  where email = 'kratos2704@outlook.es';
-- (Opcional) revocar a las demás cuentas para que solo esa sea developer:
update public.profiles set is_developer = false where email <> 'kratos2704@outlook.es';
