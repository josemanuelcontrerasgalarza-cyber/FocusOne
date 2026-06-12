-- Migración v2.0: sesiones de Deep Work
-- Ejecutar en el SQL Editor de Supabase (idempotente)

create table if not exists public.focus_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  planned_minutes integer not null default 25,
  completed boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists focus_sessions_user_idx on public.focus_sessions(user_id, started_at desc);

alter table public.focus_sessions enable row level security;

drop policy if exists "Users manage own focus sessions" on public.focus_sessions;
create policy "Users manage own focus sessions" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Índices que faltaban en el schema v1 (rendimiento)
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
create index if not exists projects_user_idx on public.projects(user_id);
create index if not exists ideas_user_idx on public.ideas(user_id);
