-- ==================================================================
-- 14_amigos.sql — Sistema de amigos
-- ==================================================================
-- Extraído de supabase/setup_all.sql (sección "AMIGOS"), ausente hasta ahora
-- de migrations/*.sql aunque el cliente (AmigosClient.tsx) la da por hecha.
-- Ejecutar en el SQL Editor de Supabase después de 13_tienda.sql (usa
-- public.points, ya creada en 06_quiz_points.sql). Es idempotente.

-- ==================================================================
-- AMIGOS
-- ==================================================================
-- Relación de amistad (modelo espejo: dos filas por par). El cliente NO escribe
-- directamente: todo pasa por RPCs SECURITY DEFINER que validan auth.uid().
create table if not exists public.friendships (
  user_id      uuid not null references auth.users (id) on delete cascade,
  friend_id    uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  requested_by uuid not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, friend_id)
);
alter table public.friendships enable row level security;
drop policy if exists "friendships_read_own" on public.friendships;
create policy "friendships_read_own" on public.friendships for select using (auth.uid() = user_id);
revoke insert, update, delete on public.friendships from anon, authenticated;

-- Enviar solicitud por correo. Si el otro ya te la envió, se aceptan mutuamente.
create or replace function public.send_friend_request(p_email text)
returns text as $$
declare v_target uuid; v_me uuid := auth.uid();
begin
  select id into v_target from public.profiles where lower(email) = lower(trim(p_email));
  if v_target is null then raise exception 'No existe una cuenta con ese correo'; end if;
  if v_target = v_me then raise exception 'No puedes agregarte a ti mismo'; end if;
  if exists (select 1 from public.friendships where user_id = v_me and friend_id = v_target and status = 'accepted') then
    raise exception 'Ya son amigos';
  end if;
  if exists (select 1 from public.friendships where user_id = v_me and friend_id = v_target and status = 'pending' and requested_by = v_target) then
    update public.friendships set status = 'accepted'
      where (user_id, friend_id) in ((v_me, v_target), (v_target, v_me));
    return 'accepted';
  end if;
  insert into public.friendships (user_id, friend_id, status, requested_by) values
    (v_me, v_target, 'pending', v_me),
    (v_target, v_me, 'pending', v_me)
    on conflict (user_id, friend_id) do nothing;
  return 'sent';
end;
$$ language plpgsql security definer set search_path = public;

-- Aceptar (o rechazar) una solicitud entrante.
create or replace function public.respond_friend_request(p_from uuid, p_accept boolean)
returns void as $$
declare v_me uuid := auth.uid();
begin
  if not exists (select 1 from public.friendships where user_id = v_me and friend_id = p_from and status = 'pending' and requested_by = p_from) then
    raise exception 'No hay solicitud pendiente de esa persona';
  end if;
  if p_accept then
    update public.friendships set status = 'accepted'
      where (user_id, friend_id) in ((v_me, p_from), (p_from, v_me));
  else
    delete from public.friendships where (user_id, friend_id) in ((v_me, p_from), (p_from, v_me));
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Eliminar amistad (o cancelar solicitud enviada).
create or replace function public.remove_friend(p_friend uuid)
returns void as $$
declare v_me uuid := auth.uid();
begin
  delete from public.friendships where (user_id, friend_id) in ((v_me, p_friend), (p_friend, v_me));
end;
$$ language plpgsql security definer set search_path = public;

-- Amigos + solicitudes (con puntos y racha para el mini-ranking).
create or replace function public.list_friends()
returns jsonb as $$
declare v_me uuid := auth.uid();
begin
  return jsonb_build_object(
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'email', p.email,
        'points', coalesce(pt.total_points, 0), 'streak', coalesce(p.streak_current, 0))
        order by coalesce(pt.total_points, 0) desc)
      from public.friendships f
      join public.profiles p on p.id = f.friend_id
      left join public.points pt on pt.user_id = f.friend_id
      where f.user_id = v_me and f.status = 'accepted'), '[]'::jsonb),
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'email', p.email))
      from public.friendships f join public.profiles p on p.id = f.friend_id
      where f.user_id = v_me and f.status = 'pending' and f.requested_by = f.friend_id), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'email', p.email))
      from public.friendships f join public.profiles p on p.id = f.friend_id
      where f.user_id = v_me and f.status = 'pending' and f.requested_by = v_me), '[]'::jsonb)
  );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.send_friend_request(text)             to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid)                   to authenticated;
grant execute on function public.list_friends()                        to authenticated;
