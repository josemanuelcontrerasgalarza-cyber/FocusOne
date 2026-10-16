-- ==================================================================
-- 13_kairo.sql — Kairo: tareas inteligentes, proyectos, objetivos, hábitos,
-- ajustes, enfoque y actividad. IDEMPOTENTE y NO destructiva: solo crea
-- tablas/columnas que falten, reutiliza `missions` (tareas) y la tabla
-- legada `projects` si ya existe, e importa las tareas v4 sin duplicarlas.
-- ==================================================================

-- ── Proyectos (reutiliza la tabla legada si existe) ─────────────────
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
alter table public.projects add column if not exists description  text;
alter table public.projects add column if not exists color        text not null default 'lime';
alter table public.projects add column if not exists status       text not null default 'active';
alter table public.projects add column if not exists priority     smallint not null default 2;
alter table public.projects add column if not exists start_date   date;
alter table public.projects add column if not exists target_date  date;
alter table public.projects add column if not exists completed_at timestamptz;
alter table public.projects add column if not exists updated_at   timestamptz not null default now();
do $$ begin
  alter table public.projects add constraint projects_kairo_status_ck
    check (status in ('active', 'paused', 'completed', 'archived'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.projects add constraint projects_kairo_name_ck
    check (char_length(name) between 1 and 120);
exception when duplicate_object or check_violation then null; end $$;
create index if not exists projects_user_idx on public.projects (user_id, created_at desc);

alter table public.projects enable row level security;
drop policy if exists "kairo_projects_select" on public.projects;
create policy "kairo_projects_select" on public.projects for select using (auth.uid() = user_id);
drop policy if exists "kairo_projects_insert" on public.projects;
create policy "kairo_projects_insert" on public.projects for insert with check (auth.uid() = user_id);
drop policy if exists "kairo_projects_update" on public.projects;
create policy "kairo_projects_update" on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "kairo_projects_delete" on public.projects;
create policy "kairo_projects_delete" on public.projects for delete using (auth.uid() = user_id);

-- ── Objetivos ────────────────────────────────────────────────────────
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 160),
  description   text,
  color         text not null default 'lime',
  target_value  integer check (target_value is null or target_value > 0),
  current_value integer not null default 0 check (current_value >= 0),
  unit          text,
  due_date      date,
  status        text not null default 'active' check (status in ('active', 'achieved', 'archived')),
  project_id    uuid references public.projects (id) on delete set null,
  created_at    timestamptz not null default now(),
  achieved_at   timestamptz
);
create index if not exists goals_user_idx on public.goals (user_id, created_at desc);
alter table public.goals enable row level security;
drop policy if exists "kairo_goals_all" on public.goals;
create policy "kairo_goals_all" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Hábitos + registros ─────────────────────────────────────────────
create table if not exists public.habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 120),
  icon            text not null default '•',
  color           text not null default 'lime',
  target_per_week smallint not null default 7 check (target_per_week between 1 and 7),
  archived        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);
alter table public.habits enable row level security;
drop policy if exists "kairo_habits_all" on public.habits;
create policy "kairo_habits_all" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.habit_logs (
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  log_date   date not null,
  created_at timestamptz not null default now(),
  primary key (habit_id, log_date)
);
create index if not exists habit_logs_user_idx on public.habit_logs (user_id, log_date desc);
alter table public.habit_logs enable row level security;
drop policy if exists "kairo_habit_logs_all" on public.habit_logs;
create policy "kairo_habit_logs_all" on public.habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Ajustes del usuario (preferencias persistentes) ─────────────────
create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  prefs      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "kairo_settings_all" on public.user_settings;
create policy "kairo_settings_all" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Tareas: `missions` evoluciona a tarea completa ──────────────────
alter table public.missions add column if not exists description    text;
alter table public.missions add column if not exists priority       smallint not null default 2;
alter table public.missions add column if not exists due_date       date;
alter table public.missions add column if not exists due_time       time;
alter table public.missions add column if not exists tags           text[] not null default '{}';
alter table public.missions add column if not exists parent_id      uuid references public.missions (id) on delete cascade;
alter table public.missions add column if not exists project_id     uuid references public.projects (id) on delete set null;
alter table public.missions add column if not exists goal_id        uuid references public.goals (id) on delete set null;
alter table public.missions add column if not exists recurrence     text;
alter table public.missions add column if not exists position       double precision;
alter table public.missions add column if not exists legacy_task_id uuid;
-- La estimación pasa a ser opcional (una tarea sin estimación no es "25 min").
alter table public.missions alter column estimated_minutes drop not null;
-- Nuevo estado "in_progress" (columna "En curso" del tablero). "active" sigue
-- siendo la tarea en enfoque (única por usuario).
alter table public.missions drop constraint if exists missions_status_check;
alter table public.missions add constraint missions_status_check
  check (status in ('pending', 'in_progress', 'active', 'completed'));
do $$ begin
  alter table public.missions add constraint missions_priority_ck check (priority between 1 and 4);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.missions add constraint missions_recurrence_ck
    check (recurrence is null or recurrence in ('daily', 'weekdays', 'weekly', 'monthly'));
exception when duplicate_object then null; end $$;
create unique index if not exists missions_legacy_task_uidx on public.missions (legacy_task_id) where legacy_task_id is not null;
create index if not exists missions_user_due_idx on public.missions (user_id, due_date);
create index if not exists missions_project_idx on public.missions (project_id);
create index if not exists missions_parent_idx on public.missions (parent_id);

-- Integridad: proyecto, objetivo y tarea padre deben pertenecer al MISMO
-- usuario (las FK solo comprueban que existan).
create or replace function public.enforce_mission_refs()
returns trigger as $$
begin
  if NEW.project_id is not null and not exists (
    select 1 from public.projects where id = NEW.project_id and user_id = NEW.user_id) then
    raise exception 'Proyecto no válido';
  end if;
  if NEW.goal_id is not null and not exists (
    select 1 from public.goals where id = NEW.goal_id and user_id = NEW.user_id) then
    raise exception 'Objetivo no válido';
  end if;
  if NEW.parent_id is not null then
    if NEW.parent_id = NEW.id then raise exception 'Una tarea no puede ser su propia subtarea'; end if;
    if not exists (select 1 from public.missions where id = NEW.parent_id and user_id = NEW.user_id) then
      raise exception 'Tarea padre no válida';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_missions_refs on public.missions;
create trigger on_missions_refs
  before insert or update of project_id, goal_id, parent_id on public.missions
  for each row execute procedure public.enforce_mission_refs();

create or replace function public.enforce_goal_refs()
returns trigger as $$
begin
  if NEW.project_id is not null and not exists (
    select 1 from public.projects where id = NEW.project_id and user_id = NEW.user_id) then
    raise exception 'Proyecto no válido';
  end if;
  if NEW.status = 'achieved' and (TG_OP = 'INSERT' or OLD.status <> 'achieved') then
    NEW.achieved_at := coalesce(NEW.achieved_at, now());
  elsif NEW.status <> 'achieved' then
    NEW.achieved_at := null;
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_goals_refs on public.goals;
create trigger on_goals_refs before insert or update on public.goals
  for each row execute procedure public.enforce_goal_refs();

-- Hábito: el registro solo puede apuntar a un hábito propio.
create or replace function public.enforce_habit_log_refs()
returns trigger as $$
begin
  if not exists (select 1 from public.habits where id = NEW.habit_id and user_id = NEW.user_id) then
    raise exception 'Hábito no válido';
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_habit_logs_refs on public.habit_logs;
create trigger on_habit_logs_refs before insert or update on public.habit_logs
  for each row execute procedure public.enforce_habit_log_refs();

-- Importa las tareas de la versión anterior (tabla `tasks`), si existe, sin
-- duplicar (legacy_task_id). Los datos originales NO se tocan.
do $$
begin
  if to_regclass('public.tasks') is not null then
    insert into public.missions
      (user_id, title, description, status, priority, due_date, project_id, completed_at, created_at, legacy_task_id, estimated_minutes)
    select t.user_id,
           left(coalesce(nullif(trim(t.title), ''), 'Tarea'), 200),
           t.description,
           case when t.status = 'completed' then 'completed' else 'pending' end,
           case t.priority when 'high' then 3 when 'low' then 1 else 2 end,
           t.due_date,
           case when exists (select 1 from public.projects p where p.id = t.project_id and p.user_id = t.user_id)
                then t.project_id end,
           t.completed_at,
           coalesce(t.created_at, now()),
           t.id,
           null
    from public.tasks t
    where not exists (select 1 from public.missions m where m.legacy_task_id = t.id);
  end if;
exception when others then
  raise notice 'Importación de tareas legadas omitida: %', sqlerrm;
end $$;

-- ── Sesiones de enfoque: tiempo REAL completado ─────────────────────
alter table public.focus_sessions add column if not exists actual_seconds integer check (actual_seconds is null or actual_seconds >= 0);
alter table public.focus_sessions add column if not exists label text;

-- ── Perfil: el usuario puede cambiar SOLO su nombre ─────────────────
create or replace function public.update_profile_name(p_name text)
returns void as $$
declare v text := trim(coalesce(p_name, ''));
begin
  if char_length(v) < 1 or char_length(v) > 60 then
    raise exception 'El nombre debe tener entre 1 y 60 caracteres';
  end if;
  update public.profiles set name = v where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function public.update_profile_name(text) to authenticated;

-- ── Totales históricos (para XP / nivel) ────────────────────────────
create or replace function public.kairo_totals()
returns jsonb as $$
begin
  return jsonb_build_object(
    'tasks_completed', (select count(*) from public.missions where user_id = auth.uid() and status = 'completed'),
    'focus_minutes', coalesce((
      select sum(coalesce(actual_seconds, case when completed then planned_minutes * 60 else 0 end)) / 60
      from public.focus_sessions where user_id = auth.uid()), 0),
    'habit_logs', (select count(*) from public.habit_logs where user_id = auth.uid()),
    'goals_achieved', (select count(*) from public.goals where user_id = auth.uid() and status = 'achieved')
  );
end;
$$ language plpgsql security definer set search_path = public stable;
grant execute on function public.kairo_totals() to authenticated;

-- ── Privacidad: borrar mis datos de productividad ───────────────────
-- Borra tareas, proyectos, objetivos, hábitos y sesiones del propio usuario.
-- No toca la cuenta, amigos ni compras de la tienda.
create or replace function public.reset_my_productivity()
returns void as $$
begin
  delete from public.quiz_results   where user_id = auth.uid();
  delete from public.missions       where user_id = auth.uid();
  delete from public.habit_logs     where user_id = auth.uid();
  delete from public.habits         where user_id = auth.uid();
  delete from public.goals          where user_id = auth.uid();
  delete from public.projects       where user_id = auth.uid();
  delete from public.focus_sessions where user_id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function public.reset_my_productivity() to authenticated;

-- ── Actividad: notificaciones de hitos (sin spam) ───────────────────
create or replace function public.kairo_notify_goal()
returns trigger as $$
begin
  if NEW.status = 'achieved' and OLD.status is distinct from 'achieved' then
    insert into public.notifications (user_id, kind, body)
      values (NEW.user_id, 'goal_achieved', 'Objetivo cumplido: ' || NEW.title);
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists on_goal_achieved_notify on public.goals;
create trigger on_goal_achieved_notify after update on public.goals
  for each row execute procedure public.kairo_notify_goal();

create or replace function public.kairo_notify_project()
returns trigger as $$
begin
  if NEW.status = 'completed' and OLD.status is distinct from 'completed' then
    insert into public.notifications (user_id, kind, body)
      values (NEW.user_id, 'project_completed', 'Proyecto completado: ' || NEW.name);
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists on_project_completed_notify on public.projects;
create trigger on_project_completed_notify after update on public.projects
  for each row execute procedure public.kairo_notify_project();

-- Hitos de tareas completadas (10, 50, 100, 250, 500, 1000).
create or replace function public.kairo_notify_task_milestone()
returns trigger as $$
declare n int;
begin
  if NEW.status = 'completed' and OLD.status is distinct from 'completed' then
    select count(*) into n from public.missions where user_id = NEW.user_id and status = 'completed';
    if n in (10, 50, 100, 250, 500, 1000) then
      insert into public.notifications (user_id, kind, body)
        values (NEW.user_id, 'milestone', n || ' tareas completadas. Constancia de verdad.');
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists on_task_milestone_notify on public.missions;
create trigger on_task_milestone_notify after update of status on public.missions
  for each row execute procedure public.kairo_notify_task_milestone();

-- Hitos de sesiones de enfoque completadas (10, 25, 50, 100, 250, 500).
create or replace function public.kairo_notify_focus_milestone()
returns trigger as $$
declare n int;
begin
  if NEW.completed and (TG_OP = 'INSERT' or OLD.completed is distinct from true) then
    select count(*) into n from public.focus_sessions where user_id = NEW.user_id and completed;
    if n in (10, 25, 50, 100, 250, 500) then
      insert into public.notifications (user_id, kind, body)
        values (NEW.user_id, 'milestone', n || ' sesiones de enfoque completadas.');
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists on_focus_milestone_notify on public.focus_sessions;
create trigger on_focus_milestone_notify after insert or update of completed on public.focus_sessions
  for each row execute procedure public.kairo_notify_focus_milestone();
