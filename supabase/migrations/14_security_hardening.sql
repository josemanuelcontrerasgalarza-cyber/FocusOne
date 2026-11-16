-- ==================================================================
-- 14_security_hardening.sql — Endurecimiento (actualización semanal #1)
-- ==================================================================
-- Idempotente y NO destructiva. Corrige tres problemas detectados en la
-- auditoría:
--
--  1. post_review estaba concedida a `anon` y su rate-limit dependía de
--     `p_ip_hash`, un valor que envía quien llama. Cualquiera podía llamar a la
--     RPC directamente (REST + clave anon pública) con un hash distinto en cada
--     petición y saltarse el límite. Se añade un TOPE GLOBAL por hora que no
--     depende de ningún dato del cliente.
--  2. send_friend_request insertaba una notificación en CADA llamada, aunque la
--     solicitud ya existiera: se podía inundar de notificaciones a cualquier
--     usuario conociendo su correo. Ahora: solo notifica si la solicitud es
--     nueva, limita a 10 solicitudes por hora y exige una cuenta no anónima
--     (la UI ya lo exigía; ahora también el servidor).
--  3. Postgres concede EXECUTE a PUBLIC (y por tanto a `anon`) en toda función
--     nueva. Ninguna RPC de la app, salvo post_review, debe poder invocarse sin
--     sesión. Se revoca a anon/PUBLIC y se concede solo a `authenticated`.

-- ── 1. Opiniones: tope global además del límite por IP ─────────────
create or replace function public.post_review(
  p_name text,
  p_rating int,
  p_comment text,
  p_ip_hash text
)
returns public.reviews as $$
declare
  v_row  public.reviews;
  v_hash text := coalesce(nullif(trim(p_ip_hash), ''), 'unknown');
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
  if char_length(v_hash) > 128 then
    raise exception 'Solicitud inválida';
  end if;

  -- Tope GLOBAL: no depende de nada que controle el cliente.
  if (
    select count(*) from public.review_throttle
    where created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'Demasiadas opiniones en este momento. Inténtalo más tarde.';
  end if;

  -- Límite por conexión (hash de IP calculado en el route handler).
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
  -- Limpieza oportunista: el registro solo sirve para la última hora.
  delete from public.review_throttle where created_at < now() - interval '1 day';
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- ── 2. Solicitudes de amistad sin spam ─────────────────────────────
create or replace function public.send_friend_request(p_email text)
returns text as $$
declare v_target uuid; v_me uuid := auth.uid(); v_name text;
begin
  if v_me is null then raise exception 'Inicia sesión para agregar amigos'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Crea una cuenta para agregar amigos';
  end if;
  if p_email is null or char_length(trim(p_email)) < 3 or char_length(p_email) > 320 then
    raise exception 'Escribe un correo válido';
  end if;

  -- Máx. 10 solicitudes por hora (anti-spam y anti-enumeración de correos).
  if (
    select count(*) from public.notifications
    where actor_id = v_me and kind = 'friend_request'
      and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Has enviado muchas solicitudes. Inténtalo más tarde.';
  end if;

  select id into v_target from public.profiles where lower(email) = lower(trim(p_email));
  if v_target is null then raise exception 'No existe una cuenta con ese correo'; end if;
  if v_target = v_me then raise exception 'No puedes agregarte a ti mismo'; end if;
  if exists (select 1 from public.friendships where user_id = v_me and friend_id = v_target and status = 'accepted') then
    raise exception 'Ya son amigos';
  end if;
  select coalesce(name, split_part(email, '@', 1)) into v_name from public.profiles where id = v_me;

  -- La otra persona ya te la envió: se aceptan mutuamente.
  if exists (select 1 from public.friendships where user_id = v_me and friend_id = v_target and status = 'pending' and requested_by = v_target) then
    update public.friendships set status = 'accepted'
      where (user_id, friend_id) in ((v_me, v_target), (v_target, v_me));
    insert into public.notifications (user_id, kind, actor_id, actor_name, body)
      values (v_target, 'friend_accepted', v_me, v_name, v_name || ' aceptó tu solicitud de amistad');
    return 'accepted';
  end if;

  -- Ya enviada: no se vuelve a notificar.
  if exists (select 1 from public.friendships where user_id = v_me and friend_id = v_target and status = 'pending' and requested_by = v_me) then
    raise exception 'Ya enviaste una solicitud a esta persona';
  end if;

  insert into public.friendships (user_id, friend_id, status, requested_by) values
    (v_me, v_target, 'pending', v_me),
    (v_target, v_me, 'pending', v_me)
    on conflict (user_id, friend_id) do nothing;
  insert into public.notifications (user_id, kind, actor_id, actor_name, body)
    values (v_target, 'friend_request', v_me, v_name, v_name || ' te envió una solicitud de amistad');
  return 'sent';
end;
$$ language plpgsql security definer set search_path = public;

-- ── 3. EXECUTE solo para sesiones autenticadas ─────────────────────
-- Las funciones de trigger no se ven afectadas (sus privilegios se comprueban
-- al crear el trigger, no al dispararse).
revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated, service_role;
-- Única RPC pública: publicar opiniones desde la landing (vía /api/reviews).
grant  execute on function public.post_review(text, int, text, text) to anon;
-- Funciones que se creen en el futuro: sin EXECUTE para PUBLIC por defecto.
alter default privileges in schema public revoke execute on functions from public, anon;
