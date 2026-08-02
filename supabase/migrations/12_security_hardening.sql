-- Migración "La Fragua": endurecimiento de funciones SECURITY DEFINER
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Todas las funciones SECURITY DEFINER de FocusOne ya califican sus tablas
-- (public.tabla, auth.uid()) así que no son explotables por "search_path
-- hijacking" hoy. Aun así, fijar SET search_path explícito es la defensa en
-- profundidad estándar de Postgres/Supabase para funciones SECURITY DEFINER
-- (el Security Advisor de Supabase marca su ausencia como advertencia
-- "function_search_path_mutable"): sin esto, un rol con permiso de CREATE en
-- algún schema que el search_path de la sesión resuelva antes que "public"
-- podría, en teoría, sombrear un objeto sin calificar dentro de la función.

alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.recalc_project_progress(uuid) set search_path = public, pg_temp;
alter function public.handle_task_progress() set search_path = public, pg_temp;
alter function public.handle_task_completed() set search_path = public, pg_temp;
alter function public.handle_mission_streak() set search_path = public, pg_temp;
alter function public.activate_mission(uuid) set search_path = public, pg_temp;
alter function public.apply_quiz_points() set search_path = public, pg_temp;
alter function public.unlock_reward(text) set search_path = public, pg_temp;
alter function public.buy_pet_item(text) set search_path = public, pg_temp;
alter function public.claim_daily(date) set search_path = public, pg_temp;
alter function public.daily_claim_state(date) set search_path = public, pg_temp;
