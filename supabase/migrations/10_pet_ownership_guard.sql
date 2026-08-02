-- Migración "La Fragua × Focus Pet": cierre de brecha de propiedad en el equipo
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Bug de seguridad: "user_pet_insert"/"user_pet_update" solo comprobaban
-- auth.uid() = user_id, sin validar que pet_id/hat_id/outfit_id/accessory_id
-- fueran ítems que el usuario realmente posee (pet_owned). Como el cliente
-- escribe user_pet directamente (upsert desde PetStudio.tsx, no vía RPC),
-- cualquiera podía llamar a la API de Supabase a mano y equiparse un ítem de
-- pago (p.ej. el Dragón, 300 puntos) sin haberlo comprado nunca, saltándose
-- por completo la economía de puntos. Esta migración exige que cada slot no
-- nulo exista en pet_owned para ese usuario antes de aceptar el insert/update.

create or replace function public.owns_pet_item(p_user uuid, p_item uuid)
returns boolean as $$
  select p_item is null or exists (
    select 1 from public.pet_owned
    where user_id = p_user and item_id = p_item
  )
$$ language sql stable;

drop policy if exists "user_pet_insert" on public.user_pet;
create policy "user_pet_insert" on public.user_pet
  for insert with check (
    auth.uid() = user_id
    and public.owns_pet_item(user_id, pet_id)
    and public.owns_pet_item(user_id, hat_id)
    and public.owns_pet_item(user_id, outfit_id)
    and public.owns_pet_item(user_id, accessory_id)
  );

drop policy if exists "user_pet_update" on public.user_pet;
create policy "user_pet_update" on public.user_pet
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.owns_pet_item(user_id, pet_id)
    and public.owns_pet_item(user_id, hat_id)
    and public.owns_pet_item(user_id, outfit_id)
    and public.owns_pet_item(user_id, accessory_id)
  );
