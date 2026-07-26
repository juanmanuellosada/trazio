-- Consecuencia de D11 (user_id redundante en todas las tablas): nada
-- impide, a nivel de RLS, escribir una tarea cuyo project_id o section_id
-- pertenezca a otro usuario, porque la fila que se escribe tiene el
-- user_id correcto. Este trigger verifica, en insert y en update de
-- project_id/section_id, que el proyecto y la sección destino sean del
-- mismo user_id que la tarea, y que la sección pertenezca al proyecto
-- indicado (si no, queda un agujero equivalente: mover una tarea a un
-- project_id propio pero con una section_id de otro proyecto propio, o de
-- otro usuario, quedaría sin detectar).
create or replace function public.tasks_validate_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_user_id uuid;
  v_section_user_id uuid;
  v_section_project_id uuid;
begin
  select user_id into v_project_user_id
  from public.projects
  where id = new.project_id;

  if v_project_user_id is null or v_project_user_id <> new.user_id then
    raise exception 'El proyecto destino no pertenece al usuario de la tarea';
  end if;

  if new.section_id is not null then
    select user_id, project_id into v_section_user_id, v_section_project_id
    from public.sections
    where id = new.section_id;

    if v_section_user_id is null or v_section_user_id <> new.user_id then
      raise exception 'La sección destino no pertenece al usuario de la tarea';
    end if;

    if v_section_project_id <> new.project_id then
      raise exception 'La sección destino no pertenece al proyecto de la tarea';
    end if;
  end if;

  return new;
end;
$$;

create trigger tasks_validate_owner_trigger
  before insert or update of project_id, section_id on public.tasks
  for each row
  execute function public.tasks_validate_owner();

-- Mismo criterio que la corrección de seguridad de esta tanda: función de
-- trigger SECURITY DEFINER, sin razón para quedar expuesta como RPC.
revoke execute on function public.tasks_validate_owner() from anon, authenticated;
