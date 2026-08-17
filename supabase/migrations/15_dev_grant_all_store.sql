-- ==================================================================
-- 15_dev_grant_all_store.sql — dev_grant_all() usa el catálogo real
-- ==================================================================
-- La versión de dev_grant_all() en 12_v5_1_hardening_dev_oauth.sql desbloquea
-- una lista fija de mascotas/recompensas anterior a la Tienda (13_tienda.sql).
-- Esta la reemplaza para que una cuenta developer desbloquee TODO el catálogo
-- real de store_items, igual que en producción (supabase/setup_all.sql).
-- Ejecutar después de 13_tienda.sql. Es idempotente.

create or replace function public.dev_grant_all()
returns void as $$
begin
  if not public.is_dev() then raise exception 'Solo para cuentas developer'; end if;
  -- Todos los ítems de la tienda.
  insert into public.store_owned (user_id, item_id)
    select auth.uid(), id from public.store_items on conflict do nothing;
  -- Los equipables, también en Focus Pet.
  insert into public.pet_owned (user_id, item_id)
    select auth.uid(), id from public.store_items where kind in ('pet','hat','outfit','accessory')
    on conflict do nothing;
  -- Todas las recompensas.
  insert into public.reward_unlocks (user_id, reward_id)
    select auth.uid(), x from unnest(array[
      'pl-lluvia','pl-synthwave','th-medianoche','th-brasa','bd-herrero','bd-racha30'
    ]) x
    on conflict do nothing;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.dev_grant_all() to authenticated;
