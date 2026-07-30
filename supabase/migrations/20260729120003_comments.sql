-- comments: hilo de comentarios de una tarea (documento de Tiptap, sin
-- fórmulas).
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.comments to authenticated, service_role;

create policy "comments_select_own" on public.comments
  for select using ((select auth.uid()) = user_id);

create policy "comments_insert_own" on public.comments
  for insert with check ((select auth.uid()) = user_id);

create policy "comments_update_own" on public.comments
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "comments_delete_own" on public.comments
  for delete using ((select auth.uid()) = user_id);

create index comments_user_id_idx on public.comments (user_id);
create index comments_task_id_idx on public.comments (task_id);
