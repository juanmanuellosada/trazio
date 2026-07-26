-- tasks: la tabla central.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  section_id uuid references public.sections (id) on delete set null,
  -- Subtareas sin límite de niveles: borrar el padre borra la subtarea.
  parent_id uuid references public.tasks (id) on delete cascade,
  title text not null,
  description jsonb,
  priority smallint not null default 4
    check (priority between 1 and 4),
  due_date date,
  due_at timestamptz,
  duration_minutes integer,
  deadline date,
  completed_at timestamptz,
  recurrence_rule text,
  recurrence_ends_at timestamptz,
  recurrence_count integer,
  position numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- due_date y due_at son excluyentes: una tarea tiene una u otra, nunca
  -- las dos a la vez.
  constraint tasks_due_date_or_due_at_exclusive
    check (due_date is null or due_at is null)
);

alter table public.tasks enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.tasks to authenticated, service_role;

create policy "tasks_select_own" on public.tasks
  for select using ((select auth.uid()) = user_id);

create policy "tasks_insert_own" on public.tasks
  for insert with check ((select auth.uid()) = user_id);

create policy "tasks_update_own" on public.tasks
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "tasks_delete_own" on public.tasks
  for delete using ((select auth.uid()) = user_id);

-- Los cuatro índices compuestos empiezan por user_id, así que ya cubren
-- el requisito de "índice en user_id" de esta tabla sin necesidad de uno
-- adicional de una sola columna.
create index tasks_user_id_due_date_idx on public.tasks (user_id, due_date);
create index tasks_user_id_due_at_idx on public.tasks (user_id, due_at);
create index tasks_user_id_project_id_position_idx on public.tasks (user_id, project_id, position);
create index tasks_user_id_completed_at_idx on public.tasks (user_id, completed_at);
create index tasks_parent_id_idx on public.tasks (parent_id);
