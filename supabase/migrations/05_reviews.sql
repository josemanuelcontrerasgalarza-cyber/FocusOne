-- Migración v4.1 — Opiniones anónimas públicas (landing).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Cualquiera (incluso sin cuenta) puede leer y publicar una opinión. El nombre
-- es opcional: si se deja vacío se muestra como "Anónimo".
--
-- ⚠️ NO aplicar este archivo solo: la policy "Anyone can post a review" de
-- abajo permite insertar sin límite. La migración 12 la revoca y la sustituye
-- por la RPC post_review (rate-limited). `supabase/setup_all.sql` —la fuente
-- de verdad— ya incluye ese hardening; úsalo en vez de aplicar migraciones
-- una a una.

create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  name text,
  rating int not null default 5 check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 1 and 500),
  created_at timestamptz default now()
);

create index if not exists reviews_created_idx on public.reviews(created_at desc);

alter table public.reviews enable row level security;

-- Lectura pública
drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews" on public.reviews
  for select using (true);

-- Publicación pública (con validación básica en la propia política)
drop policy if exists "Anyone can post a review" on public.reviews;
create policy "Anyone can post a review" on public.reviews
  for insert with check (
    rating between 1 and 5 and char_length(comment) between 1 and 500
  );

-- El rol anónimo (clave anon) necesita el privilegio a nivel de tabla
grant select, insert on public.reviews to anon, authenticated;
