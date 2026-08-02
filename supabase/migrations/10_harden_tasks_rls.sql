-- Migración v2.3 — Endurecer RLS de `tasks` (auditoría de seguridad semanal).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Hallazgo: la política original "Users manage own tasks" (schema.sql) es un
-- único FOR ALL USING (auth.uid() = user_id), sin WITH CHECK explícito y sin
-- validar que `project_id` pertenezca al propio usuario. Un usuario autenticado
-- puede llamar a la REST API de Supabase directamente (sin pasar por la UI) e
-- insertar/mover una tarea propia (user_id = auth.uid(), así que pasa la
-- política) apuntando a `project_id` de OTRO usuario. Esa tarea ajena cuenta en
-- el trigger `recalc_project_progress`, corrompiendo el progreso del proyecto
-- de la víctima sin su consentimiento. Mismo patrón de "insert with check +
-- exists(...)" que ya usa `quiz_insert_own` en 06_quiz_points.sql.

drop policy if exists "Users manage own tasks" on public.tasks;

create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);

create policy "tasks_insert_own" on public.tasks
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);
