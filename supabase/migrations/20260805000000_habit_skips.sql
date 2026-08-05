-- habit_skips: día puntual en que el usuario decidió no hacer un hábito
-- (openspec/changes/calendario-legible-y-manipulable, "Un hábito se puede
-- saltear un día puntual"). Tabla propia, separada de las otras dos de
-- hábitos por lo que cada una ya significa:
--
-- No entra en `habit_completions`: esa tabla es lo único que lee
-- `calcular_racha_habito` (migración 20260729180000). Guardar el salteo ahí
-- —aunque sea con una columna aparte— arriesgaría que algún cambio futuro a
-- esa función lo cuente sin querer. Una tabla que la función de racha ni
-- siquiera conoce deja fuera de discusión que saltear pueda tocar la racha.
--
-- No entra en `habit_schedule_overrides`: esa tabla reprograma un horario
-- (`scheduled_time not null`), un concepto distinto de "decidí no hacerlo
-- este día". Forzar esa columna a nullable para acomodar un salteo
-- mezclaría dos decisiones que no tienen por qué viajar juntas ni
-- reutilizarse entre sí.
--
-- `user_id` propio, no derivado por join contra habits (D11 de
-- decisions.md, mismo criterio que las otras dos tablas de hábitos). Clave
-- primaria compuesta (habit_id, date), igual que `habit_schedule_overrides`:
-- a lo sumo un salteo por hábito y día, sin necesitar un id propio.
--
-- Fuera de la publicación de realtime por ahora, mismo motivo que
-- `habit_schedule_overrides` (D-A de design.md de fase-3-habitos): todavía
-- ninguna interfaz se suscribe a esta tabla. Sumarla junto con el cableado
-- del bloque de calendario que la vaya a leer en vivo.
create table public.habit_skips (
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  primary key (habit_id, date)
);

alter table public.habit_skips enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.habit_skips to authenticated, service_role;

create policy "habit_skips_select_own" on public.habit_skips
  for select using ((select auth.uid()) = user_id);

create policy "habit_skips_insert_own" on public.habit_skips
  for insert with check ((select auth.uid()) = user_id);

create policy "habit_skips_update_own" on public.habit_skips
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "habit_skips_delete_own" on public.habit_skips
  for delete using ((select auth.uid()) = user_id);

-- La PK compuesta ya cubre habit_id como columna líder, pero no user_id:
-- se indexa aparte para que la política de RLS no escanee la tabla entera
-- (mismo criterio que habit_schedule_overrides_user_id_idx).
create index habit_skips_user_id_idx on public.habit_skips (user_id);
