-- La migración que creó tasks (20260726011609_tasks.sql) define updated_at
-- con default now(), pero nada lo actualiza en un update: una tarea editada
-- quedaba con updated_at == created_at para siempre. Es el mismo bug que
-- tenía comments (20260729150000_comments_updated_at_trigger.sql) y se
-- resuelve con el mismo patrón: un trigger, en vez de mandar updated_at
-- desde cada mutación (lib/tasks/mutations.ts) — así queda correcto sin
-- importar por dónde se escriba la tabla.
--
-- projects, sections y labels no tienen columna updated_at (nunca la
-- definieron), así que no comparten este bug: no hay nada que arreglar ahí.
--
-- SECURITY INVOKER (el default, igual que comments_set_updated_at): solo
-- toca la fila NEW de la propia transacción de update, sin privilegios
-- elevados.
create or replace function public.tasks_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_set_updated_at_trigger
  before update on public.tasks
  for each row
  execute function public.tasks_set_updated_at();
