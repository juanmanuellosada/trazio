-- habit_schedule_overrides: reprograma el horario de un hábito para un día
-- puntual sin tocar su horario habitual (docs/data-model.md). `user_id`
-- propio, no derivado por join contra habits (D11 de decisions.md). No
-- entra en la publicación de realtime: no hay interfaz que se suscriba a
-- cambios acá (D-A de design.md de fase-3-habitos).
create table public.habit_schedule_overrides (
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  scheduled_time time not null,
  primary key (habit_id, date)
);

alter table public.habit_schedule_overrides enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.habit_schedule_overrides to authenticated, service_role;

create policy "habit_schedule_overrides_select_own" on public.habit_schedule_overrides
  for select using ((select auth.uid()) = user_id);

create policy "habit_schedule_overrides_insert_own" on public.habit_schedule_overrides
  for insert with check ((select auth.uid()) = user_id);

create policy "habit_schedule_overrides_update_own" on public.habit_schedule_overrides
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "habit_schedule_overrides_delete_own" on public.habit_schedule_overrides
  for delete using ((select auth.uid()) = user_id);

-- La PK compuesta ya cubre habit_id como columna líder, pero no user_id:
-- se indexa aparte para que la política de RLS no escanee la tabla entera
-- (mismo criterio que task_labels_user_id_idx en 20260726011614_task_labels.sql).
create index habit_schedule_overrides_user_id_idx on public.habit_schedule_overrides (user_id);
