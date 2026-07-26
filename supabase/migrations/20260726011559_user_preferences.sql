-- user_preferences: una fila por usuario, con los defaults y check
-- constraints de la sección B4 del design de fase 1.
create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  -- Solo dd/MM/yyyy o yyyy-MM-dd: no hay formato mes-primero, sería
  -- incoherente con la regla R1 del parser (día primero).
  date_format text not null default 'dd/MM/yyyy'
    check (date_format in ('dd/MM/yyyy', 'yyyy-MM-dd')),
  time_format smallint not null default 24
    check (time_format in (12, 24)),
  -- 0 domingo, 1 lunes, 6 sábado.
  week_starts_on smallint not null default 1
    check (week_starts_on in (0, 1, 6)),
  -- En fase 1 solo bandeja y hoy; 'proximos' se agrega en fase 2.
  default_view text not null default 'bandeja'
    check (default_view in ('bandeja', 'hoy')),
  -- FK hacia public.projects agregada en la migración de `projects`
  -- (20260726011602_projects.sql): esa tabla todavía no existe acá, dado
  -- el orden de dependencia declarado para esta fase.
  default_project_id uuid
);

alter table public.user_preferences enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.user_preferences to authenticated, service_role;

create policy "user_preferences_select_own" on public.user_preferences
  for select using ((select auth.uid()) = user_id);

create policy "user_preferences_insert_own" on public.user_preferences
  for insert with check ((select auth.uid()) = user_id);

create policy "user_preferences_update_own" on public.user_preferences
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "user_preferences_delete_own" on public.user_preferences
  for delete using ((select auth.uid()) = user_id);

-- La primary key ya es un índice sobre `user_id`.
