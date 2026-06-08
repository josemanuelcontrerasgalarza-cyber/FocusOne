-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- USUARIOS (extiende auth.users de Supabase)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  avatar_url text,
  streak_current integer default 0,
  streak_best integer default 0,
  streak_last_date date,
  tasks_completed_total integer default 0,
  projects_completed_total integer default 0,
  created_at timestamptz default now()
);

-- PROYECTOS
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  goal text,
  is_main boolean default false,
  progress integer default 0,
  status text default 'active' check (status in ('active','paused','completed','archived')),
  start_date date default current_date,
  target_date date,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Solo un proyecto principal por usuario
create unique index one_main_project_per_user
  on projects(user_id)
  where is_main = true;

-- TAREAS
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('high','medium','low')),
  status text default 'pending' check (status in ('pending','completed')),
  due_date date,
  order_index integer default 0,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- IDEAS
create table public.ideas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  tags text[] default '{}',
  converted_to_project_id uuid references public.projects(id),
  created_at timestamptz default now()
);

-- ESTADÍSTICAS DIARIAS
create table public.daily_stats (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null default current_date,
  tasks_completed integer default 0,
  unique(user_id, date)
);

-- RLS (Row Level Security) — cada usuario solo ve sus datos
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.ideas enable row level security;
alter table public.daily_stats enable row level security;

create policy "Users see own profile" on profiles for all using (auth.uid() = id);
create policy "Users manage own projects" on projects for all using (auth.uid() = user_id);
create policy "Users manage own tasks" on tasks for all using (auth.uid() = user_id);
create policy "Users manage own ideas" on ideas for all using (auth.uid() = user_id);
create policy "Users see own stats" on daily_stats for all using (auth.uid() = user_id);

-- Trigger: crear profile automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
