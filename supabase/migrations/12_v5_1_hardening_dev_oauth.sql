-- Migración v5.1+ — Hardening, cuenta developer, score en servidor,
-- rate-limit de reseñas y soporte OAuth (Google).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- NOTA: `supabase/setup_all.sql` es la fuente de verdad (contiene TODO junto y
-- ya incluye esto). Este archivo consolida los objetos NUEVOS desde la v5.0 por
-- si aplicas las migraciones una a una. El login con Google NO necesita SQL
-- extra (el trigger handle_new_user ya crea el perfil de cualquier alta,
-- incluidas las de OAuth); solo se habilita el proveedor en el panel de Supabase.

-- ── Rol de desarrollador ────────────────────────────────────────────────────
alter table public.profiles add column if not exists is_developer boolean not null default false;

create or replace function public.is_dev()
returns boolean as $$
  select coalesce((select is_developer from public.profiles where id = auth.uid()), false);
$$ language sql security definer set search_path = public stable;

-- ── Score del quiz EN EL SERVIDOR (anti-farm) ───────────────────────────────
revoke insert on public.quiz_results from authenticated, anon;

create or replace function public.close_mission(p_mission uuid, p_answers int[])
returns table(score integer, points_earned integer) as $$
declare
  v_weights numeric[] := array[1.0,0.6,0.3, 1.0,0.6,0.2, 1.0,0.5,0.2, 1.0,0.5,0.1];
  v_sum numeric := 0; v_idx int; v_score int; v_pts int; i int;
begin
  select qr.score, qr.points_earned into v_score, v_pts
    from public.quiz_results qr
    where qr.mission_id = p_mission and qr.user_id = auth.uid();
  if found then
    return query select v_score, coalesce(v_pts, 0);
    return;
  end if;

  if not exists (select 1 from public.missions
                 where id = p_mission and user_id = auth.uid() and status = 'active') then
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

  select qr.points_earned into v_pts from public.quiz_results qr where qr.mission_id = p_mission;

  update public.missions set status = 'completed'
    where id = p_mission and user_id = auth.uid() and status <> 'completed';

  return query select v_score, coalesce(v_pts, 0);
end;
$$ language plpgsql security definer set search_path = public;

-- ── Rate-limit de reseñas (publicar solo por RPC) ───────────────────────────
revoke insert on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;

create table if not exists public.review_throttle (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists review_throttle_idx on public.review_throttle (ip_hash, created_at desc);
alter table public.review_throttle enable row level security;
revoke all on public.review_throttle from anon, authenticated;

create or replace function public.post_review(p_name text, p_rating int, p_comment text, p_ip_hash text)
returns public.reviews as $$
declare v_row public.reviews;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Valoración inválida'; end if;
  if p_comment is null or char_length(trim(p_comment)) < 1 or char_length(p_comment) > 500 then
    raise exception 'Comentario inválido';
  end if;
  if p_name is not null and char_length(p_name) > 80 then raise exception 'Nombre demasiado largo'; end if;
  if (select count(*) from public.review_throttle
      where ip_hash = coalesce(p_ip_hash, 'unknown') and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Demasiadas opiniones desde tu conexión. Inténtalo más tarde.';
  end if;
  insert into public.reviews (name, rating, comment)
    values (nullif(trim(coalesce(p_name, '')), ''), p_rating, trim(p_comment)) returning * into v_row;
  insert into public.review_throttle (ip_hash) values (coalesce(p_ip_hash, 'unknown'));
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function public.post_review(text, int, text, text) to anon, authenticated;

-- ── Herramientas de developer ───────────────────────────────────────────────
create or replace function public.dev_reset() returns void as $$
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  delete from public.quiz_results  where user_id = auth.uid();
  delete from public.missions      where user_id = auth.uid();
  delete from public.reward_unlocks where user_id = auth.uid();
  delete from public.pet_owned     where user_id = auth.uid();
  delete from public.user_pet      where user_id = auth.uid();
  delete from public.daily_claims  where user_id = auth.uid();
  update public.points set total_points = 0, updated_at = now() where user_id = auth.uid();
  update public.profiles set streak_current = 0, streak_best = 0, streak_last_date = null where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.dev_add_points(p_amount int) returns int as $$
declare v_total int;
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  insert into public.points (user_id, total_points) values (auth.uid(), greatest(coalesce(p_amount,0),0))
    on conflict (user_id) do update set total_points = greatest(public.points.total_points + p_amount, 0), updated_at = now()
    returning total_points into v_total;
  return v_total;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.dev_set_streak(p_value int) returns void as $$
declare v int := greatest(coalesce(p_value,0),0);
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  update public.profiles set streak_current = v, streak_best = greatest(streak_best, v), streak_last_date = current_date
    where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.dev_snapshot() returns jsonb as $$
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  return jsonb_build_object(
    'missions_total',(select count(*) from public.missions where user_id=auth.uid()),
    'missions_active',(select count(*) from public.missions where user_id=auth.uid() and status='active'),
    'missions_pending',(select count(*) from public.missions where user_id=auth.uid() and status='pending'),
    'missions_completed',(select count(*) from public.missions where user_id=auth.uid() and status='completed'),
    'quiz_results',(select count(*) from public.quiz_results where user_id=auth.uid()),
    'points',(select coalesce(total_points,0) from public.points where user_id=auth.uid()),
    'streak',(select coalesce(streak_current,0) from public.profiles where id=auth.uid()),
    'streak_best',(select coalesce(streak_best,0) from public.profiles where id=auth.uid()),
    'pets_owned',(select count(*) from public.pet_owned where user_id=auth.uid()),
    'rewards_unlocked',(select count(*) from public.reward_unlocks where user_id=auth.uid()),
    'daily_claims',(select count(*) from public.daily_claims where user_id=auth.uid()),
    'focus_sessions',(select count(*) from public.focus_sessions where user_id=auth.uid()),
    'is_developer',true,'server_time',now());
end;$$ language plpgsql security definer set search_path = public;

create or replace function public.dev_grant_all() returns void as $$
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  insert into public.pet_owned (user_id, item_id)
    select auth.uid(), x from unnest(array['gato','perro','zorro','buho','dragon','gorro','corona','bufanda','capa','gafas','medalla']) x
    on conflict do nothing;
  insert into public.reward_unlocks (user_id, reward_id)
    select auth.uid(), x from unnest(array['pl-lluvia','pl-synthwave','th-medianoche','th-brasa','bd-herrero','bd-racha30']) x
    on conflict do nothing;
end;$$ language plpgsql security definer set search_path = public;

create or replace function public.dev_set_points(p_value int) returns int as $$
declare v int := greatest(coalesce(p_value,0),0);
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  insert into public.points (user_id, total_points) values (auth.uid(), v)
    on conflict (user_id) do update set total_points = v, updated_at = now();
  return v;
end;$$ language plpgsql security definer set search_path = public;

grant execute on function public.dev_reset()         to authenticated;
grant execute on function public.dev_add_points(int) to authenticated;
grant execute on function public.dev_set_streak(int) to authenticated;
grant execute on function public.dev_snapshot()      to authenticated;
grant execute on function public.dev_grant_all()     to authenticated;
grant execute on function public.dev_set_points(int) to authenticated;

-- ── Marcar la cuenta developer ──────────────────────────────────────────────
update public.profiles set is_developer = true  where email = 'kratos2704@outlook.es';
