-- habit_completions: marcas de un hábito por día (docs/data-model.md).
-- `user_id` propio, no derivado por join contra habits, para que la
-- política de RLS sea una sola comparación directa (D11 de decisions.md).
-- El índice (habit_id, completed_on desc) es el que abarata el cálculo de
-- racha (D-B de design.md de fase-3-habitos): sin él, la función de racha
-- escanearía todo el historial del hábito en cada lectura.
create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  completed_on date not null,
  unique (habit_id, completed_on)
);

alter table public.habit_completions enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.habit_completions to authenticated, service_role;

create policy "habit_completions_select_own" on public.habit_completions
  for select using ((select auth.uid()) = user_id);

create policy "habit_completions_insert_own" on public.habit_completions
  for insert with check ((select auth.uid()) = user_id);

create policy "habit_completions_update_own" on public.habit_completions
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "habit_completions_delete_own" on public.habit_completions
  for delete using ((select auth.uid()) = user_id);

create index habit_completions_user_id_idx on public.habit_completions (user_id);

-- El índice que abarata el cálculo de racha: todas las marcas de un hábito,
-- de la más reciente a la más antigua.
create index habit_completions_habit_id_completed_on_idx
  on public.habit_completions (habit_id, completed_on desc);
