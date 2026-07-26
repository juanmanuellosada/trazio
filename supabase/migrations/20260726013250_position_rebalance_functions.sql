-- Rebalanceo de position (B5 del design): espaciado inicial de 1000 entre
-- hermanos; cuando la diferencia entre dos vecinos baja de 0.0001, se
-- rebalancean los hermanos de ese padre en una sola transacción (una
-- función PL/pgSQL, atómica por sí misma). Tres funciones, una por grupo
-- de hermanos: tareas dentro de un mismo proyecto y sección, proyectos
-- entre hermanos (mismo parent_id) y secciones entre hermanas (mismo
-- project_id).
--
-- SECURITY INVOKER (el default, declarado igual para que quede explícito):
-- se invocan desde el cliente vía RPC, y el UPDATE ya queda acotado por la
-- política de RLS de update de cada tabla. El filtro por user_id acá
-- adentro es redundante con esa política pero deja la función correcta
-- por sí misma, sin depender implícitamente de RLS para no mezclar los
-- hermanos de otro usuario.
create or replace function public.rebalance_task_positions(
  p_project_id uuid,
  p_section_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  with ordered as (
    select id, row_number() over (order by position) as rn
    from public.tasks
    where user_id = v_user_id
      and project_id = p_project_id
      and section_id is not distinct from p_section_id
  )
  update public.tasks t
  set position = ordered.rn * 1000
  from ordered
  where t.id = ordered.id;
end;
$$;

create or replace function public.rebalance_project_positions(
  p_parent_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  with ordered as (
    select id, row_number() over (order by position) as rn
    from public.projects
    where user_id = v_user_id
      and parent_id is not distinct from p_parent_id
  )
  update public.projects p
  set position = ordered.rn * 1000
  from ordered
  where p.id = ordered.id;
end;
$$;

create or replace function public.rebalance_section_positions(
  p_project_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  with ordered as (
    select id, row_number() over (order by position) as rn
    from public.sections
    where user_id = v_user_id
      and project_id = p_project_id
  )
  update public.sections s
  set position = ordered.rn * 1000
  from ordered
  where s.id = ordered.id;
end;
$$;

-- SECURITY INVOKER, pensadas para invocarse como RPC desde el cliente
-- autenticado: EXECUTE explícito, sin el cual PostgREST las rechaza (ver
-- el comentario del GRANT en 20260726011557_profiles.sql sobre el mismo
-- patrón para tablas).
grant execute on function public.rebalance_task_positions(uuid, uuid) to authenticated;
grant execute on function public.rebalance_project_positions(uuid) to authenticated;
grant execute on function public.rebalance_section_positions(uuid) to authenticated;
