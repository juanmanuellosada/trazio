-- enlace-de-lectura-de-un-proyecto (D-A): columna de token para la vista
-- pública de un proyecto. Nulo = no compartido (D-A/D-H: desactivar vuelve
-- a nulo, nunca borra la fila). NUNCA se deriva del id del proyecto ni de
-- ningún otro dato: se genera aleatorio, acá abajo, con
-- extensions.gen_random_bytes(32) (256 bits) — pgcrypto ya está disponible
-- en el esquema `extensions` en Supabase, sin necesitar `create extension`.
alter table public.projects
  add column share_token text;

-- Único entre los tokens activos; varios proyectos sin compartir pueden
-- tener el mismo valor nulo (índice parcial, no filtra esos).
create unique index projects_share_token_idx on public.projects (share_token)
  where share_token is not null;

-- Genera (o regenera: es la misma operación, D-A — el token anterior deja
-- de existir en la fila en cuanto este UPDATE corre) el enlace de lectura
-- de un proyecto propio.
--
-- security invoker, NO definer: corre con el rol de quien llama, así que
-- la política `projects_update_own` (20260726011602_projects.sql) es la
-- que decide si puede escribir esta fila — no hace falta reimplementar el
-- chequeo de dueño acá. `and is_inbox = false` es una segunda barrera,
-- redundante con que la interfaz nunca ofrece "Compartir" en la Bandeja
-- (spec `enlace-de-lectura`: "La Bandeja de entrada NUNCA SHALL poder
-- compartirse"): si alguien igual invoca esta función con el id de su
-- Bandeja, el UPDATE no encuentra fila, `new_token` queda en null por el
-- `returning ... into`, y se rechaza con la misma excepción que "no es
-- tuyo".
--
-- El token: encode(gen_random_bytes(32), 'base64') produce base64
-- estándar ('+', '/', relleno '='); translate() lo normaliza a base64url
-- en un solo paso — '+' -> '-', '/' -> '_', y '=' se borra porque el
-- tercer argumento no tiene un carácter de reemplazo para esa posición
-- (comportamiento documentado de translate() cuando `to` es más corto que
-- `from`).
create or replace function public.regenerate_project_share_token(p_project_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_token text;
begin
  new_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  update public.projects
  set share_token = new_token
  where id = p_project_id
    and is_inbox = false
  returning share_token into new_token;

  if new_token is null then
    raise exception 'No se pudo generar el enlace: el proyecto no existe, no es tuyo, o es la Bandeja de entrada.';
  end if;

  return new_token;
end;
$$;

-- CREATE FUNCTION otorga EXECUTE a PUBLIC por defecto (ver el comentario de
-- 20260726013239_security_revoke_trigger_execute.sql): se revoca y se
-- vuelve a otorgar solo a `authenticated`, que es quien la invoca desde el
-- menú "Compartir" del proyecto.
revoke execute on function public.regenerate_project_share_token(uuid) from public;
grant execute on function public.regenerate_project_share_token(uuid) to authenticated;

-- Desactivar el enlace (D-A) no necesita una función propia: es un UPDATE
-- directo de `share_token` a null contra la fila del proyecto, protegido
-- por la misma política `projects_update_own` que ya cubre cualquier otro
-- campo — el mismo camino que usa `useUpdateProject` (lib/projects/mutations.ts)
-- para editar/archivar/favoritear.
