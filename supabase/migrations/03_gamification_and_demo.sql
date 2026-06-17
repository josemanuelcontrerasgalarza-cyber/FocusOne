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
