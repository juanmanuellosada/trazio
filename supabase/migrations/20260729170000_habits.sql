-- habits: hábitos del usuario (docs/data-model.md, capacidad
-- `esquema-datos` de openspec/changes/fase-3-habitos). Distinto de una
-- tarea: no cuelga de un proyecto, no tiene sección, etiquetas, prioridad ni
-- comentarios, y no se "completa" — se repite y se archiva cuando se deja
-- de hacer.
--
-- `days_of_week` codifica los días de la semana en ISO-8601: 1 = lunes …
-- 7 = domingo, la misma numeración que devuelve `extract(isodow from …)` en
-- Postgres. No es la convención de `extract(dow from …)` (0 = domingo, la
-- otra que Postgres ofrece): quien lea esta columna sin este comentario va
-- a asumir la convención equivocada.
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null,
  -- Mismo criterio que projects.color y labels.color (D19, D29 de
  -- decisions.md): paleta fija de diez colores con nombre, o un hex
  -- personalizado de seis dígitos. El contraste AA contra los dos temas se
  -- valida en lib/validation/, no acá.
  color text not null
    check (
      color in (
        'amarillo', 'lima', 'verde', 'turquesa', 'celeste',
        'indigo', 'violeta', 'purpura', 'magenta', 'marron'
      )
      or color ~ '^#[0-9A-Fa-f]{6}$'
    ),
  duration_minutes integer not null,
  -- Sin valor: el hábito es "todo el día", sin horario fijo.
  scheduled_time time,
  frequency_type text not null
    check (frequency_type in ('daily', 'times_per_week', 'specific_days')),
  -- Obligatorio y entre 1 y 7 únicamente para 'times_per_week'; nulo para
  -- los otros dos tipos.
  times_per_week smallint
    check (
      (frequency_type = 'times_per_week' and times_per_week between 1 and 7)
      or (frequency_type <> 'times_per_week' and times_per_week is null)
    ),
  -- Obligatorio, no vacío y con cada elemento en 1..7 únicamente para
  -- 'specific_days'; nulo para los otros dos tipos. `cardinality` (no
  -- `array_length`) porque `array_length` de un array vacío es NULL, no 0,
  -- y un check constraint trata NULL como que pasa: con `array_length` un
  -- array vacío se habría colado. `<@` (contenido en) evita una
  -- subconsulta, que un check constraint no admite.
  days_of_week smallint[]
    check (
      (
        frequency_type = 'specific_days'
        and days_of_week is not null
        and cardinality(days_of_week) > 0
        and days_of_week <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
      )
      or (frequency_type <> 'specific_days' and days_of_week is null)
    ),
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.habits enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.habits to authenticated, service_role;

create policy "habits_select_own" on public.habits
  for select using ((select auth.uid()) = user_id);

create policy "habits_insert_own" on public.habits
  for insert with check ((select auth.uid()) = user_id);

create policy "habits_update_own" on public.habits
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "habits_delete_own" on public.habits
  for delete using ((select auth.uid()) = user_id);

create index habits_user_id_idx on public.habits (user_id);
