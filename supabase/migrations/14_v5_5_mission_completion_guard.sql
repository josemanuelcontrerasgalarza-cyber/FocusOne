-- FocusOne v5.5 — Auditoría semanal: cierra el hueco que permitía "forjar"
-- una misión sin resolver el quiz, y acota focus_sessions a duraciones reales.
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.

-- ==================================================================
-- 1) missions: solo close_mission() puede pasar una misión a 'completed'.
--    La policy "missions_update_own" (auth.uid() = user_id, sin más) permite
--    hoy `supabase.from('missions').update({status:'completed'}).eq('id', x)`
--    directo desde el navegador con la anon key: salta el quiz, dispara los
--    triggers de racha/completed_at igual que un cierre legítimo y deja
--    farmear el contador de "misiones forjadas" creando misiones basura y
--    completándolas al instante. El código de la app nunca hace ese UPDATE
--    directo (solo usa activate_mission/close_mission), así que esto no
--    cambia ningún flujo real.
--
--    close_mission marca una bandera de sesión (set_config, local a la
--    transacción) justo antes de su propio UPDATE; el trigger exige esa
--    bandera para aceptar la transición a 'completed'.
-- ==================================================================
create or replace function public.guard_mission_completion()
returns trigger as $$
begin
  if NEW.status = 'completed' and OLD.status is distinct from 'completed' then
    if coalesce(current_setting('focusone.allow_complete', true), '') <> 'on' then
      raise exception 'Una misión solo se completa cerrando su quiz';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists on_mission_completion_guard on public.missions;
create trigger on_mission_completion_guard
  before update on public.missions
  for each row execute procedure public.guard_mission_completion();

create or replace function public.close_mission(p_mission uuid, p_answers int[])
returns table(score integer, points_earned integer) as $$
declare
  v_weights numeric[] := array[
    1.0, 0.6, 0.3,
    1.0, 0.6, 0.2,
    1.0, 0.5, 0.2,
    1.0, 0.5, 0.1
  ];
  v_sum   numeric := 0;
  v_idx   int;
  v_score int;
  v_pts   int;
  i       int;
begin
  select qr.score, qr.points_earned into v_score, v_pts
    from public.quiz_results qr
    where qr.mission_id = p_mission and qr.user_id = auth.uid();
  if found then
    return query select v_score, coalesce(v_pts, 0);
    return;
  end if;

  if not exists (
    select 1 from public.missions
    where id = p_mission and user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Misión no válida o no está activa';
  end if;

  for i in 1..4 loop
    v_idx := coalesce(p_answers[i], 2);
    if v_idx < 0 or v_idx > 2 then v_idx := 2; end if;
    v_sum := v_sum + v_weights[(i - 1) * 3 + v_idx + 1];
  end loop;
  v_score := round((v_sum / 4.0) * 100);

  insert into public.quiz_results (user_id, mission_id, questions_json, score)
    values (auth.uid(), p_mission, '[]'::jsonb, v_score)
    on conflict (mission_id) do nothing;

  select qr.points_earned into v_pts
    from public.quiz_results qr where qr.mission_id = p_mission;

  -- Bandera local a esta transacción: el trigger de guardia la exige para
  -- aceptar el paso a 'completed'. `set_config(..., true)` la limita a la
  -- transacción actual, así que no hace falta desactivarla después.
  perform set_config('focusone.allow_complete', 'on', true);
  update public.missions set status = 'completed'
    where id = p_mission and user_id = auth.uid() and status <> 'completed';

  return query select v_score, coalesce(v_pts, 0);
end;
$$ language plpgsql security definer set search_path = public;

-- ==================================================================
-- 2) focus_sessions: acota planned_minutes al rango real de la UI (1-180).
--    Sin límite, un UPDATE/INSERT directo del cliente podía inflar
--    "Enfoque hoy" y el promedio semanal en /progreso con minutos de fantasía.
--    No afecta al flujo real: /deep-work ya clampa el input entre 1 y 180.
-- ==================================================================
-- NOT VALID: se aplica a partir de ahora sin escanear ni poder romper la
-- migración por filas antiguas fuera de rango que ya existieran.
alter table public.focus_sessions
  drop constraint if exists focus_sessions_planned_minutes_check;
alter table public.focus_sessions
  add constraint focus_sessions_planned_minutes_check
  check (planned_minutes between 1 and 180) not valid;
