-- filters: filtros guardados en el lenguaje de consulta de fase 2. La
-- consulta se guarda tal cual el usuario la escribió, sin parsear (ver
-- docs/data-model.md): el parser corre en tiempo de ejecución, así se
-- puede mejorar sin migrar datos.
create table public.filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  query text not null,
  -- Misma paleta fija que projects.color y labels.color, con el mismo
  -- color personalizado en hexadecimal admitido (ver
  -- 20260729000000_labels_color_allow_custom_hex.sql). El mínimo de
  -- contraste contra los dos temas lo valida Zod antes de guardar, no este
  -- check.
  color text not null
    check (
      color in (
        'amarillo', 'lima', 'verde', 'turquesa', 'celeste',
        'indigo', 'violeta', 'purpura', 'magenta', 'marron'
      )
      or color ~ '^#[0-9A-Fa-f]{6}$'
    ),
  icon text,
  is_favorite boolean not null default false
);

alter table public.filters enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.filters to authenticated, service_role;

create policy "filters_select_own" on public.filters
  for select using ((select auth.uid()) = user_id);

create policy "filters_insert_own" on public.filters
  for insert with check ((select auth.uid()) = user_id);

create policy "filters_update_own" on public.filters
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "filters_delete_own" on public.filters
  for delete using ((select auth.uid()) = user_id);

create index filters_user_id_idx on public.filters (user_id);
