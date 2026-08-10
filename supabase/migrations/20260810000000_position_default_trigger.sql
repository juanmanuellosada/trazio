-- Ola 2 de servidor-mcp (D-F de design.md): `position` se vuelve opcional
-- al insertar en tasks, projects y sections. Hoy la columna es `numeric
-- not null` sin default, y el valor lo calcula el navegador leyendo el
-- caché de TanStack Query (último hermano + SIBLING_SPACING, ver
-- lib/tasks/tree.ts y lib/projects/tree.ts). Un cliente sin ese caché (el
-- MCP) no puede mandarlo, y hasta acá el insert fallaba con violación de
-- not-null.
--
-- Se verificó de forma empírica, no solo leída, que un trigger BEFORE
-- INSERT corre antes de que Postgres chequee la restricción NOT NULL: se
-- puede completar NEW.position en el trigger sin volver la columna
-- nullable, así que la garantía "esta columna nunca es null" se mantiene
-- para cualquier otro camino de inserción presente o futuro.
--
-- El navegador sigue mandando su propia posición: la necesita para el
-- update optimista (la fila aparece en su lugar antes de que conteste el
-- servidor), y estos triggers solo actúan cuando `position` llega en null
-- — si viene un valor, se respeta tal cual.
--
-- Espaciado: 1000, el mismo valor que `SIBLING_SPACING` en
-- lib/projects/tree.ts — si uno cambia, cambiar el otro (y este comentario
-- para quien lo lea del otro lado).
--
-- Concurrencia: dos inserciones sin `position` en el mismo contexto de
-- hermanos (ej. dos llamados del MCP seguidos, o el MCP y el navegador a
-- la vez) podrían calcular el mismo `max(position) + 1000` si corrieran
-- en paralelo sin coordinarse. No hay constraint de unicidad sobre
-- `position` (fragilidad preexistente, ver D-F) así que un empate no
-- rompe el insert, pero sí deja dos filas en el mismo lugar visual hasta
-- el próximo rebalanceo — evitable sin mucho costo, así que se evita: cada
-- función toma un `pg_advisory_xact_lock` con clave = tabla + contexto de
-- hermanos antes de leer `max(position)`. Es un lock de transacción (se
-- libera solo al commit/rollback), así que el segundo insert del mismo
-- contexto espera a que el primero termine y ve su valor ya escrito; dos
-- inserciones en contextos distintos no se bloquean entre sí. Costo: nulo
-- para el camino del navegador (que ya manda su posición y nunca entra a
-- esta rama) y mínimo para el del MCP.

create or replace function public.tasks_default_position()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.position is not null then
    return new;
  end if;

  if new.parent_id is not null then
    perform pg_advisory_xact_lock(
      1,
      hashtext('tasks:' || new.user_id::text || ':parent:' || new.parent_id::text)
    );

    select coalesce(max(position), 0) + 1000 into new.position
    from public.tasks
    where user_id = new.user_id
      and project_id = new.project_id
      and parent_id = new.parent_id;
  else
    perform pg_advisory_xact_lock(
      1,
      hashtext('tasks:' || new.user_id::text || ':' || new.project_id::text || ':' ||
               coalesce(new.section_id::text, ''))
    );

    select coalesce(max(position), 0) + 1000 into new.position
    from public.tasks
    where user_id = new.user_id
      and project_id = new.project_id
      and section_id is not distinct from new.section_id
      and parent_id is null;
  end if;

  return new;
end;
$$;

create trigger tasks_default_position_trigger
  before insert on public.tasks
  for each row
  execute function public.tasks_default_position();


create or replace function public.projects_default_position()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.position is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    2,
    hashtext('projects:' || new.user_id::text || ':' || coalesce(new.parent_id::text, ''))
  );

  select coalesce(max(position), 0) + 1000 into new.position
  from public.projects
  where user_id = new.user_id
    and parent_id is not distinct from new.parent_id;

  return new;
end;
$$;

create trigger projects_default_position_trigger
  before insert on public.projects
  for each row
  execute function public.projects_default_position();


create or replace function public.sections_default_position()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.position is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    3,
    hashtext('sections:' || new.user_id::text || ':' || new.project_id::text)
  );

  select coalesce(max(position), 0) + 1000 into new.position
  from public.sections
  where user_id = new.user_id
    and project_id = new.project_id;

  return new;
end;
$$;

create trigger sections_default_position_trigger
  before insert on public.sections
  for each row
  execute function public.sections_default_position();
