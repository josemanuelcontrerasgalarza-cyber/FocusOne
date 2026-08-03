-- ==================================================================
-- 13_v5_3_profiles_update_policy_mission_steps.sql
-- ==================================================================
-- Dos arreglos independientes, cada uno idempotente.

-- ----------------------------------------------------------------------------
-- 1) profiles nunca tuvo policy RLS de UPDATE. La migración 03 concedió
--    `grant update (email, name, avatar_url)`, pero sin una policy de UPDATE
--    RLS bloquea la fila igual (deniega por defecto), así que
--    upgradeAccount() (convertir cuenta demo en real) nunca persistía el
--    nuevo email/name en profiles pese a no dar error. Con el grant ya
--    limitado a esas tres columnas, is_developer/racha/puntos siguen sin
--    poder tocarlos el cliente.
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2) Pasos opcionales dentro de una misión (2-8 sub-tareas cortas) para bajar
--    la barrera de arranque en misiones grandes/vagas. Se muestran y marcan
--    en /hoy, aparte del quiz de cierre (no bloquean "Terminar misión").
--    jsonb: [{ "label": string, "done": boolean }, ...]
-- ----------------------------------------------------------------------------
alter table public.missions add column if not exists steps jsonb not null default '[]'::jsonb;
alter table public.missions drop constraint if exists missions_steps_len_check;
alter table public.missions add constraint missions_steps_len_check check (jsonb_array_length(steps) <= 8);
