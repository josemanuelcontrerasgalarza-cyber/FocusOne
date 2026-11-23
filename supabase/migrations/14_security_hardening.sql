-- ==================================================================
-- 14_security_hardening.sql — Endurecimiento semanal (noviembre 2026)
-- ==================================================================
-- Idempotente y no destructivo (no borra datos). Incluido también al final de
-- `supabase/setup_all.sql`, así que basta con volver a ejecutar ese archivo.
--
-- 1. profiles: elimina la policy FOR ALL del esquema v1 ("Users see own
--    profile") que, si sigue en la base, deja a cualquiera escribir su propio
--    perfil (incluido is_developer). profiles queda sin UPDATE para el cliente;
--    el nombre se cambia con update_profile_name() y el email se sincroniza
--    desde auth.users (solo cuando Supabase lo confirma).
-- 2. post_review: el hash de IP lo manda quien llama, así que el límite por
--    IP se puede saltar llamando a la RPC directamente. Se añade un tope
--    GLOBAL (30 opiniones/hora) y se purga la tabla de throttling.
-- 3. send_friend_request: solo notifica si la solicitud es nueva y limita a
--    20 solicitudes por hora por remitente (evita spam de notificaciones).
-- 4. close_mission: tope de 20 cierres con puntos cada 24 h por usuario. Por
--    encima del tope la misión se cierra igual, pero sin puntos (anti-farm).
-- 5. focus_sessions.actual_seconds: máximo 24 h por sesión.

-- ── 1. Perfil ───────────────────────────────────────────────────────────────
drop policy if exists "Users see own profile" on public.profiles;
revoke update on public.profiles from anon, authenticated;

create or replace function public.sync_profile_email()
returns trigger as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute procedure public.sync_profile_email();

-- ── 2. Opiniones ────────────────────────────────────────────────────────────
create or replace function public.post_review(
  p_name text,
  p_rating int,
  p_comment text,
  p_ip_hash text
)
returns public.reviews as $$
declare
  v_row public.reviews;
  v_hash text := left(coalesce(nullif(p_ip_hash, ''), 'unknown'), 128);
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

  -- La tabla de throttling solo necesita la última hora.
  delete from public.review_throttle where created_at < now() - interval '1 day';

  -- Tope global: aunque alguien falsifique el hash, no puede inundar reviews.
  if (
    select count(*) from public.review_throttle
    where created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'Demasiadas opiniones ahora mismo. Inténtalo más tarde.';
  end if;

  -- Límite por conexión: 3 por hora.
  if (
    select count(*) from public.review_throttle
    where ip_hash = v_hash and created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'Demasiadas opiniones desde tu conexión. Inténtalo más tarde.';
  end if;

  insert into public.reviews (name, rating, comment)
    values (nullif(trim(coalesce(p_name, '')), ''), p_rating, trim(p_comment))
    returning * into v_row;

  insert into public.review_throttle (ip_hash) values (v_hash);
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.post_review(text, int, text, text) to anon, authenticated;

-- ── 3. Solicitudes de amistad ───────────────────────────────────────────────
create or replace function public.send_friend_request(p_email text)
returns text as $$
declare v_target uuid; v_me uuid := auth.uid(); v_name text; v_n int;
begin
  if v_me is null then raise exception 'Inicia sesión'; end if;
  if (
    select count(*) from public.notifications
    where actor_id = v_me and kind = 'friend_request' and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Has enviado muchas solicitudes. Inténtalo más tarde.';
  end if;

  select id into v_target from public.profiles where lower(email) = lower(trim(p_email));
  if v_target is null then raise exception 'No existe una cuenta con ese correo'; end if;
  if v_target = v_me then raise exception 'No puedes agregarte a ti mismo'; end if;
  if exists (select 1 from public.friendships where user_id = v_me and friend_id = v_target and status = 'accepted') then
    raise exception 'Ya son amigos';
  end if;
  select coalesce(name, split_part(email, '@', 1)) into v_name from public.profiles where id = v_me;

  if exists (select 1 from public.friendships where user_id = v_me and friend_id = v_target and status = 'pending' and requested_by = v_target) then
    update public.friendships set status = 'accepted'
      where (user_id, friend_id) in ((v_me, v_target), (v_target, v_me));
    insert into public.notifications (user_id, kind, actor_id, actor_name, body)
      values (v_target, 'friend_accepted', v_me, v_name, v_name || ' aceptó tu solicitud de amistad');
    return 'accepted';
  end if;

  insert into public.friendships (user_id, friend_id, status, requested_by) values
    (v_me, v_target, 'pending', v_me),
    (v_target, v_me, 'pending', v_me)
    on conflict (user_id, friend_id) do nothing;
  get diagnostics v_n = row_count;
  -- Solo se notifica una solicitud NUEVA (repetirla no vuelve a avisar).
  if v_n > 0 then
    insert into public.notifications (user_id, kind, actor_id, actor_name, body)
      values (v_target, 'friend_request', v_me, v_name, v_name || ' te envió una solicitud de amistad');
  end if;
  return 'sent';
end;
$$ language plpgsql security definer set search_path = public;

-- ── 4. Cierre de misión con tope diario de puntos ───────────────────────────
create or replace function public.close_mission(p_mission uuid, p_answers int[])
returns table(score integer, points_earned integer) as $$
declare
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
  -- Reintento idempotente.
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

  -- Anti-farm: máx. 20 cierres con puntos cada 24 h. Por encima, se completa
  -- la misión pero no se registran puntos.
  if (
    select count(*) from public.quiz_results
    where user_id = auth.uid() and completed_at > now() - interval '1 day'
  ) >= 20 then
    update public.missions set status = 'completed'
      where id = p_mission and user_id = auth.uid() and status <> 'completed';
    return query select v_score, 0;
    return;
  end if;

  insert into public.quiz_results (user_id, mission_id, questions_json, score)
    values (auth.uid(), p_mission, '[]'::jsonb, v_score)
    on conflict (mission_id) do nothing;

  select qr.points_earned into v_pts
    from public.quiz_results qr where qr.mission_id = p_mission;

  update public.missions set status = 'completed'
    where id = p_mission and user_id = auth.uid() and status <> 'completed';

  return query select v_score, coalesce(v_pts, 0);
end;
$$ language plpgsql security definer set search_path = public;

-- ── 5. Sesiones de enfoque: duración razonable ──────────────────────────────
update public.focus_sessions set actual_seconds = 86400 where actual_seconds > 86400;
alter table public.focus_sessions drop constraint if exists focus_sessions_actual_seconds_max;
alter table public.focus_sessions
  add constraint focus_sessions_actual_seconds_max check (actual_seconds is null or actual_seconds <= 86400);
