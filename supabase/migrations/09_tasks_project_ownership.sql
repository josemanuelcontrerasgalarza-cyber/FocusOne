-- Migración v4.2 — Endurecimiento RLS: tasks.project_id validado contra el
-- dueño del proyecto (hallazgo de la auditoría semanal, severidad media).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Problema: la policy original "Users manage own tasks" (schema.sql) es un
-- único `for all using (auth.uid() = user_id)` sin `with check` que valide
-- `project_id`. Un usuario autenticado puede insertar/actualizar una tarea
-- propia (user_id = su propio auth.uid()) apuntando a un `project_id` de OTRO
-- usuario. El trigger `handle_task_progress` (03_gamification_and_demo.sql)
-- recalcula `projects.progress` contando TODAS las tareas de ese project_id,
-- sin filtrar por dueño → el atacante puede falsear el progreso de un
-- proyecto ajeno. No hay fuga de lectura (el SELECT sigue protegido), es un
-- problema de integridad. Mismo patrón ya usado correctamente en
-- `quiz_insert_own` (06_quiz_points.sql).

drop policy if exists "Users manage own tasks" on public.tasks;

create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);

create policy "tasks_insert_own" on public.tasks
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);
