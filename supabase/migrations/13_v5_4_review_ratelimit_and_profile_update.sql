-- FocusOne v5.4 — Auditoría semanal: cierra el bypass del rate-limit de
-- reseñas y añade una vía segura para que el cliente actualice su propio
-- nombre/correo en `profiles` sin tocar columnas de servidor (racha, dev).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.

-- ==================================================================
-- 1) post_review: la IP se hashea DENTRO de Postgres, nunca la manda el
--    cliente. Antes `p_ip_hash` viajaba como parámetro: cualquiera podía
--    llamar a la RPC por REST con un hash aleatorio en cada intento y
--    saltarse el límite de 3 opiniones/hora por completo.
-- ==================================================================
create extension if not exists pgcrypto with schema extensions;

drop function if exists public.post_review(text, int, text, text);

create or replace function public.post_review(
  p_name text,
  p_rating int,
  p_comment text
)
returns public.reviews as $$
declare
  v_row public.reviews;
  v_headers json;
  v_ip text;
  v_ip_hash text;
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

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ip := nullif(trim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), '');
  v_ip_hash := encode(extensions.digest(coalesce(v_ip, 'unknown') || '|focusone-reviews', 'sha256'), 'hex');

  if (
    select count(*) from public.review_throttle
    where ip_hash = v_ip_hash
      and created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'Demasiadas opiniones desde tu conexión. Inténtalo más tarde.';
  end if;

  insert into public.reviews (name, rating, comment)
    values (nullif(trim(coalesce(p_name, '')), ''), p_rating, trim(p_comment))
    returning * into v_row;

  insert into public.review_throttle (ip_hash) values (v_ip_hash);
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.post_review(text, int, text) to anon, authenticated;

-- ==================================================================
-- 2) update_profile_display: `profiles` no tiene (ni debe tener) policy de
--    UPDATE — así nadie escribe streak_current/is_developer con la anon key.
--    Pero eso hacía que el upgrade de cuenta demo→real (authStore.upgradeAccount)
--    intentara un UPDATE directo que RLS bloqueaba en silencio: el nombre/correo
--    quedaban desactualizados en `profiles` aunque auth.users sí se actualizaba.
--    Esta RPC deja escribir SOLO nombre/correo, siempre acotado a auth.uid().
-- ==================================================================
create or replace function public.update_profile_display(p_email text, p_name text)
returns void as $$
begin
  update public.profiles
    set email = coalesce(nullif(trim(p_email), ''), email),
        name  = coalesce(nullif(trim(p_name), ''), name)
    where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.update_profile_display(text, text) to authenticated;
