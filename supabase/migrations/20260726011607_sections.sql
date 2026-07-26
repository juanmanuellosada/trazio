-- sections: agrupan tareas dentro de un proyecto.
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  position numeric not null,
  is_collapsed boolean not null default false
);

alter table public.sections enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.sections to authenticated, service_role;

create policy "sections_select_own" on public.sections
  for select using ((select auth.uid()) = user_id);

create policy "sections_insert_own" on public.sections
  for insert with check ((select auth.uid()) = user_id);

create policy "sections_update_own" on public.sections
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "sections_delete_own" on public.sections
  for delete using ((select auth.uid()) = user_id);

create index sections_user_id_idx on public.sections (user_id);

-- FK muy consultada (cargar las secciones de un proyecto): se indexa
-- junto con la columna, como manda .claude/rules/database.md.
create index sections_project_id_idx on public.sections (project_id);
