-- Migración v2.0 — KRATOS IA: historial de conversaciones del chat.
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.

-- ============================================================================
-- 1. CONVERSACIONES
-- ============================================================================
create table if not exists public.kratos_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null default 'Nueva conversación',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists kratos_conv_user_idx
  on public.kratos_conversations(user_id, updated_at desc);

-- ============================================================================
-- 2. MENSAJES
-- ============================================================================
create table if not exists public.kratos_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.kratos_conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  created_at timestamptz default now()
);

create index if not exists kratos_msg_conv_idx
  on public.kratos_messages(conversation_id, created_at);

-- ============================================================================
-- 3. RLS — cada usuario solo accede a sus propias conversaciones y mensajes
-- ============================================================================
alter table public.kratos_conversations enable row level security;
alter table public.kratos_messages enable row level security;

drop policy if exists "Users manage own conversations" on public.kratos_conversations;
create policy "Users manage own conversations" on public.kratos_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own messages" on public.kratos_messages;
create policy "Users manage own messages" on public.kratos_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
