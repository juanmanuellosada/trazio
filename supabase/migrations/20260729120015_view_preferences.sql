-- view_preferences: opciones de vista por pantalla (D-H de design.md). Sin
-- columna `id` propia: la clave primaria es la combinación de user_id y
-- view_key. view_key es texto libre compuesto en la aplicación (bandeja,
-- hoy, proximos, proyecto:<id>, etiqueta:<id>, filtro:<id>) y
-- deliberadamente no lleva foreign key hacia projects/labels/filters: una
-- fila huérfana de un recurso eliminado sigue existiendo sin error, y la
-- aplicación la ignora al leer.
create table public.view_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  view_key text not null,
  options jsonb not null default '{}'::jsonb,
  primary key (user_id, view_key)
);

alter table public.view_preferences enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.view_preferences to authenticated, service_role;

create policy "view_preferences_select_own" on public.view_preferences
  for select using ((select auth.uid()) = user_id);

create policy "view_preferences_insert_own" on public.view_preferences
  for insert with check ((select auth.uid()) = user_id);

create policy "view_preferences_update_own" on public.view_preferences
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "view_preferences_delete_own" on public.view_preferences
  for delete using ((select auth.uid()) = user_id);

-- La PK compuesta ya empieza por user_id, así que ya es un índice sobre esa
-- columna (mismo razonamiento que en user_preferences).
