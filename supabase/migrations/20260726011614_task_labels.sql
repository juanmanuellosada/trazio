-- task_labels: tabla puente entre tasks y labels.
create table public.task_labels (
  task_id uuid not null references public.tasks (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  -- Columna propia (no derivada por join) para que la política de RLS
  -- sea una sola comparación directa, según la decisión D11.
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (task_id, label_id)
);

alter table public.task_labels enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.task_labels to authenticated, service_role;

create policy "task_labels_select_own" on public.task_labels
  for select using ((select auth.uid()) = user_id);

create policy "task_labels_insert_own" on public.task_labels
  for insert with check ((select auth.uid()) = user_id);

create policy "task_labels_update_own" on public.task_labels
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "task_labels_delete_own" on public.task_labels
  for delete using ((select auth.uid()) = user_id);

-- La PK compuesta ya cubre task_id como columna líder, pero no user_id:
-- se indexa aparte para que la política de RLS (y los listados "todas
-- las etiquetas de mis tareas") no escaneen la tabla entera.
create index task_labels_user_id_idx on public.task_labels (user_id);
