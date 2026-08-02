-- FocusOne · La Fragua — Setup COMPLETO de base de datos
-- Pega TODO esto en el SQL Editor de Supabase (supabase.com -> tu proyecto -> SQL Editor -> New query) y pulsa Run.
-- Es idempotente: puedes correrlo varias veces sin romper nada.
-- Habilita: sesiones de foco, gamificación, misiones, opiniones, puntos+quiz, racha, recompensas y Focus Pet.

-- ==================================================================
-- 02_focus_sessions.sql
-- ==================================================================
-- Migración v2.0: sesiones de Deep Work
-- Ejecutar en el SQL Editor de Supabase (idempotente)

create table if not exists public.focus_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  planned_minutes integer not null default 25,
  completed boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists focus_sessions_user_idx on public.focus_sessions(user_id, started_at desc);

alter table public.focus_sessions enable row level security;

drop policy if exists "Users manage own focus sessions" on public.focus_sessions;
create policy "Users manage own focus sessions" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Índices que faltaban en el schema v1 (rendimiento)
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
create index if not exists projects_user_idx on public.projects(user_id);
create index if not exists ideas_user_idx on public.ideas(user_id);

-- ==================================================================
-- 03_gamification_and_demo.sql
-- ==================================================================
-- Migración v2.1 — Gamificación en servidor (cierra S1) + soporte Modo Demo
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.

-- ============================================================================
-- 1. PERFILES PARA USUARIOS ANÓNIMOS (Modo Demo)
--    Los usuarios anónimos no tienen email; generamos uno único y un nombre
--    de invitado para no violar las restricciones NOT NULL / UNIQUE.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, 'demo-' || new.id::text || '@focusone.local'),
    coalesce(
      new.raw_user_meta_data->>'name',
      case when new.email is null then 'Invitado' else split_part(new.email, '@', 1) end
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 2. PROGRESO DEL PROYECTO — calculado por el servidor
-- ============================================================================
create or replace function public.recalc_project_progress(p_project uuid)
returns void as $$
declare
  v_total integer;
  v_done integer;
begin
  select count(*), count(*) filter (where status = 'completed')
    into v_total, v_done
    from public.tasks
    where project_id = p_project;

  update public.projects
    set progress = case when v_total = 0 then 0
                        else round(v_done::numeric * 100 / v_total) end
    where id = p_project;
end;
$$ language plpgsql security definer;

create or replace function public.handle_task_progress()
returns trigger as $$
begin
  if (TG_OP = 'DELETE') then
    perform public.recalc_project_progress(OLD.project_id);
    return OLD;
  end if;

  perform public.recalc_project_progress(NEW.project_id);
  if (TG_OP = 'UPDATE' and NEW.project_id is distinct from OLD.project_id) then
    perform public.recalc_project_progress(OLD.project_id);
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_task_progress on public.tasks;
create trigger on_task_progress
  after insert or update or delete on public.tasks
  for each row execute procedure public.handle_task_progress();

-- ============================================================================
-- 3. RACHA Y ESTADÍSTICAS — calculadas por el servidor (NO falsificables)
--    Se dispara solo cuando una tarea PASA a 'completed'.
-- ============================================================================
create or replace function public.handle_task_completed()
returns trigger as $$
declare
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_streak integer;
  v_best integer;
  v_last date;
  v_new_streak integer;
begin
  if NEW.status = 'completed' and (OLD.status is distinct from 'completed') then
    -- Conteo diario
    insert into public.daily_stats (user_id, date, tasks_completed)
    values (NEW.user_id, v_today, 1)
    on conflict (user_id, date)
    do update set tasks_completed = public.daily_stats.tasks_completed + 1;

    -- Racha
    select streak_current, streak_best, streak_last_date
      into v_streak, v_best, v_last
      from public.profiles
      where id = NEW.user_id;

    if v_last = v_today then
      v_new_streak := coalesce(v_streak, 0);          -- ya contó hoy
    elsif v_last = v_yesterday then
      v_new_streak := coalesce(v_streak, 0) + 1;      -- racha continúa
    else
      v_new_streak := 1;                              -- racha reinicia
    end if;

    update public.profiles set
      streak_current = v_new_streak,
      streak_best = greatest(v_new_streak, coalesce(v_best, 0)),
      streak_last_date = v_today,
      tasks_completed_total = coalesce(tasks_completed_total, 0) + 1
    where id = NEW.user_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_task_completed on public.tasks;
create trigger on_task_completed
  after update on public.tasks
  for each row execute procedure public.handle_task_completed();

-- ============================================================================
-- 4. ENDURECIMIENTO RLS (S1): el cliente NO puede escribir la gamificación.
--    Solo puede editar email/name/avatar (necesario para convertir cuenta
--    demo en real). Las columnas de racha/XP solo las escribe el trigger,
--    que corre como SECURITY DEFINER.
-- ============================================================================
revoke update on public.profiles from authenticated, anon;
grant update (email, name, avatar_url) on public.profiles to authenticated, anon;

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
$$ language plpgsql;

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
$$ language plpgsql;

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
$$ language plpgsql security definer;

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
  name text,
  rating int not null default 5 check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 1 and 500),
  created_at timestamptz default now()
);

create index if not exists reviews_created_idx on public.reviews(created_at desc);

alter table public.reviews enable row level security;

-- Lectura pública
drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews" on public.reviews
  for select using (true);

-- Publicación pública (con validación básica en la propia política)
drop policy if exists "Anyone can post a review" on public.reviews;
create policy "Anyone can post a review" on public.reviews
  for insert with check (
    rating between 1 and 5 and char_length(comment) between 1 and 500
  );

-- El rol anónimo (clave anon) necesita el privilegio a nivel de tabla
grant select, insert on public.reviews to anon, authenticated;

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
$$ language plpgsql;

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
$$ language plpgsql security definer;

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

-- Solo puede insertar un cierre de UNA misión propia.
drop policy if exists "quiz_insert_own" on public.quiz_results;
create policy "quiz_insert_own" on public.quiz_results
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.missions m
      where m.id = mission_id and m.user_id = auth.uid()
    )
  );

alter table public.points enable row level security;

drop policy if exists "points_select_own" on public.points;
create policy "points_select_own" on public.points
  for select using (auth.uid() = user_id);

-- El cliente NO escribe puntos: solo el trigger (SECURITY DEFINER) lo hace.
revoke insert, update, delete on public.points from authenticated, anon;

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
$$ language plpgsql security definer;

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

  if exists (
    select 1 from public.reward_unlocks where user_id = auth.uid() and reward_id = p_reward
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

  insert into public.reward_unlocks (user_id, reward_id) values (auth.uid(), p_reward);
  return v_total - v_cost;
end;
$$ language plpgsql security definer;

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

  if v_cost > 0 then
    update public.points
      set total_points = total_points - v_cost, updated_at = now()
      where user_id = auth.uid();
  end if;

  insert into public.pet_owned (user_id, item_id) values (auth.uid(), p_item);
  return v_total - v_cost;
end;
$$ language plpgsql security definer;
