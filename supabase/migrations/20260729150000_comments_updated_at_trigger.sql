-- La migración que creó comments (20260729120003_comments.sql) define
-- updated_at con default now(), pero nada lo actualiza en un update: un
-- comentario editado quedaba con updated_at == created_at para siempre, y
-- la marca "editado" del requirement "Un comentario editado se marca como
-- 'editado'" (specs/comentarios/spec.md) nunca aparecía. Se resuelve con
-- un trigger en vez de mandar updated_at desde useUpdateComment
-- (lib/comments/mutations.ts): así queda correcto sin importar por dónde
-- se escriba la tabla (SQL editor, otra mutación futura, RPC), en vez de
-- depender de que cada call site se acuerde de mandarlo.
--
-- SECURITY INVOKER (el default, declarado igual que en
-- rebalance_task_positions de 20260726013250_position_rebalance_functions.sql):
-- solo toca la fila NEW de la propia transacción de update, sin necesitar
-- privilegios elevados, así que no hace falta SECURITY DEFINER ni revocar
-- EXECUTE de anon/authenticated.
create or replace function public.comments_set_updated_at()
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

create trigger comments_set_updated_at_trigger
  before update on public.comments
  for each row
  execute function public.comments_set_updated_at();
