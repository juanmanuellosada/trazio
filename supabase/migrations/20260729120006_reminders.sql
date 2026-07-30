-- reminders: recordatorios push de una tarea. Se reclaman con un update
-- atómico antes de enviarse (D-C de design.md): el índice parcial de acá es
-- el que usa ese cron para no escanear la tabla entera cada minuto.
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  remind_at timestamptz not null,
  offset_minutes integer,
  delivered_at timestamptz
);

alter table public.reminders enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.reminders to authenticated, service_role;

create policy "reminders_select_own" on public.reminders
  for select using ((select auth.uid()) = user_id);

create policy "reminders_insert_own" on public.reminders
  for insert with check ((select auth.uid()) = user_id);

create policy "reminders_update_own" on public.reminders
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "reminders_delete_own" on public.reminders
  for delete using ((select auth.uid()) = user_id);

create index reminders_user_id_idx on public.reminders (user_id);

-- Índice parcial: solo cubre los recordatorios aún no entregados, que es
-- exactamente lo que el cron de envío consulta cada minuto.
create index reminders_remind_at_pending_idx on public.reminders (remind_at)
  where delivered_at is null;
