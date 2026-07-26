-- labels: etiquetas del usuario.
create table public.labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  -- Paleta fija: los mismos diez colores con nombre de
  -- lib/validation/colors.ts (PROJECT_COLOR_IDS), para que la base y Zod
  -- no diverjan.
  color text not null
    check (color in (
      'amarillo', 'lima', 'verde', 'turquesa', 'celeste',
      'indigo', 'violeta', 'purpura', 'magenta', 'marron'
    )),
  -- Columna presente desde esta fase aunque la funcionalidad de
  -- favoritos sea de fase 2.
  is_favorite boolean not null default false,
  unique (user_id, name)
);

alter table public.labels enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.labels to authenticated, service_role;

create policy "labels_select_own" on public.labels
  for select using ((select auth.uid()) = user_id);

create policy "labels_insert_own" on public.labels
  for insert with check ((select auth.uid()) = user_id);

create policy "labels_update_own" on public.labels
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "labels_delete_own" on public.labels
  for delete using ((select auth.uid()) = user_id);

create index labels_user_id_idx on public.labels (user_id);
