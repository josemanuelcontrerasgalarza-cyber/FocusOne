-- Migración 13 — Auto-actualización de perfil (nombre/correo).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- `profiles` no tiene policy de UPDATE a propósito, para que nadie se
-- auto-asigne is_developer ni falsifique su racha (ver 00_profiles.sql). Sin
-- embargo eso significa que un UPDATE directo del cliente a name/email
-- (p. ej. al pasar de cuenta demo a cuenta real) no tocaba ninguna fila y
-- fallaba en silencio. Esta RPC SECURITY DEFINER permite ese caso concreto,
-- limitado a la fila del propio usuario y solo a las columnas name/email.
--
-- NOTA: `supabase/setup_all.sql` es la fuente de verdad y ya incluye esto.

create or replace function public.sync_own_profile(p_name text, p_email text)
returns void as $$
begin
  update public.profiles
    set name = coalesce(nullif(trim(p_name), ''), name),
        email = coalesce(nullif(trim(p_email), ''), email)
    where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function public.sync_own_profile(text, text) to authenticated;
