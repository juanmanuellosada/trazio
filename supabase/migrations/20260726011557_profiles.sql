-- profiles: extiende auth.users con datos de perfil.
-- Ojo: acá la columna de propiedad es `id` (igual a auth.users.id), no
-- `user_id` como en el resto de las tablas de esta fase. Las cuatro
-- políticas de RLS comparan contra `id` por esa razón, no por descuido: no
-- hay lugar para una columna user_id redundante acá, porque el id ya ES el
-- id del usuario.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Sin este grant, RLS es letra muerta: las migraciones corren como el rol
-- `postgres`, cuyos privilegios por defecto en `public` NO exponen las
-- tablas nuevas a `authenticated`/`service_role` (a diferencia de las
-- tablas creadas por `supabase_admin`, que sí las exponen). GRANT y RLS
-- son dos filtros independientes: sin el primero, Postgres rechaza el
-- acceso antes siquiera de evaluar las políticas.
grant select, insert, update, delete on public.profiles to authenticated, service_role;

create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id)
             with check ((select auth.uid()) = id);

create policy "profiles_delete_own" on public.profiles
  for delete using ((select auth.uid()) = id);

-- La primary key ya es un índice sobre `id`, que cumple acá el rol que en
-- el resto de las tablas cumple el índice sobre `user_id`.
