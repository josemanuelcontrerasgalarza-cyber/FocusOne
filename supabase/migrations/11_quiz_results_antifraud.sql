-- Migración "La Fragua": cierre de brecha de farmeo de puntos en quiz_results
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- PROBLEMA (auditoría de seguridad semanal): la política RLS de inserción en
-- quiz_results solo comprobaba que la misión referenciada perteneciera al
-- usuario, sin exigir que estuviera 'active' ni limitar cuántos cierres podía
-- insertar para la MISMA misión. Como `score` (y por tanto points_earned vía
-- el trigger) lo decide el cliente, cualquier usuario autenticado podía abrir
-- la consola del navegador y repetir:
--   supabase.from('quiz_results').insert({ user_id, mission_id, score: 100 })
-- en bucle, sumando puntos ilimitados y comprando toda la tienda/Focus Pet.
--
-- FIX (dos capas, igual que el resto de la app "el servidor manda"):
--   1) Índice único (user_id, mission_id): como máximo UN cierre por misión.
--   2) La política exige que la misión esté 'active' en el momento del
--      cierre (igual que exige el flujo normal en src/lib/quiz.ts).
-- Con (1)+(2): tras el primer cierre válido, ni se puede repetir para esa
-- misión (unicidad) ni reutilizar mission_id en otra misión no activa.

-- ============================================================================
-- 1. Máximo un cierre de quiz por misión.
-- ============================================================================
-- Nota: si en producción ya existieran duplicados (no debería, la app nunca
-- los generó por este flujo), esta creación fallaría; en ese caso habría que
-- limpiar duplicados antes de re-ejecutar. Con datos actuales es segura.
create unique index if not exists quiz_results_user_mission_idx
  on public.quiz_results (user_id, mission_id);

-- ============================================================================
-- 2. La política de inserción ahora exige que la misión esté 'active'.
-- ============================================================================
drop policy if exists "quiz_insert_own" on public.quiz_results;
create policy "quiz_insert_own" on public.quiz_results
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.missions m
      where m.id = mission_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );
