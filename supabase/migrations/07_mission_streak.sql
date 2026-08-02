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
