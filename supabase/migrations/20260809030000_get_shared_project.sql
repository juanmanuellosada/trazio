-- enlace-de-lectura-de-un-proyecto (D-B): la lectura pública de un proyecto
-- compartido. Es la ÚNICA función del esquema otorgada al rol `anon` — hasta
-- acá, las 76 políticas de las 19 tablas de `public` se apoyan en
-- `auth.uid()` (ver el Context de design.md); esta es la primera puerta que
-- no depende de una sesión, solo de un secreto de 256 bits (share_token,
-- 20260809020000_projects_share_token.sql). Por eso están comentadas las
-- tres reglas de D-B una por una: quien la toque después tiene que poder
-- releerlas acá mismo, sin ir a buscar el design doc.
--
-- Regla 1 — recibe el token y nada más. NUNCA un id de proyecto: si
-- aceptara uno, cualquiera que conociera un id (aparecen en la URL de la
-- app, en enlaces "Copiar enlace" de tareas, etc.) podría leer ese proyecto
-- sin el token. La firma de esta función (un solo parámetro `text`) hace
-- ese error imposible de cometer sin cambiar la firma misma.
--
-- Regla 2 — enumera las columnas a mano, NUNCA `select *`. Los tres
-- `jsonb_build_object` de abajo son la lista blanca completa de D-E: si
-- `tasks` gana una columna mañana (pasó tres veces esta semana, según el
-- design), esta función sigue devolviendo exactamente estos campos hasta
-- que alguien la edite a propósito. El test
-- supabase/tests/enlace-de-lectura.test.ts ("no devuelve más columnas que
-- las declaradas") es la protección real: si alguien reemplaza esto por
-- `select *` en el futuro, ese test es el que se rompe.
--
-- Regla 3 — token inexistente y token revocado devuelven lo mismo. No hay
-- una rama que distinga "no existe" de "existía y se desactivó": las dos
-- caen en el mismo `if not found then return null`, porque un share_token
-- revocado vuelve a null (20260809020000) y `share_token = p_token` nunca
-- matchea null contra un p_token no vacío.
--
-- `security definer` + `search_path = ''`: corre con los privilegios del
-- dueño de la función (quien migra, con bypass de RLS), así que ve
-- cualquier proyecto por su token sin depender de qué filas expone RLS al
-- rol `anon` que la invoca — que es, precisamente, ninguna (`anon` no
-- tiene ningún grant de tabla; ver el comentario de los grants al final).
-- `search_path = ''` obliga a calificar todo objeto con su esquema
-- (`public.projects`, etc.), igual que el resto de las funciones definer
-- del proyecto (`projects_check_hierarchy`, 20260726011602_projects.sql).
--
-- `and p.is_inbox = false`: segunda barrera, redundante con que la Bandeja
-- nunca puede generar un token (20260809020000) — si por algún bug futuro
-- llegara a tener uno, esta función lo sigue rechazando.
--
-- Un proyecto archivado SÍ se devuelve (D-H: archivar es organización
-- personal, no una decisión sobre quién puede mirar) — no hay filtro por
-- `is_archived` acá a propósito.
create or replace function public.get_shared_project(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project record;
  v_sections jsonb;
  v_tasks jsonb;
begin
  if p_token is null or p_token = '' then
    return null;
  end if;

  select p.id, p.name, p.color, p.icon
  into v_project
  from public.projects p
  where p.share_token = p_token
    and p.is_inbox = false
  limit 1;

  if not found then
    return null;
  end if;

  -- Nombre y descripción de cada sección (D-E). Ordenadas por posición: el
  -- orden del array ya es el orden a mostrar, sin publicar la posición en
  -- sí (D-E la excluye explícitamente de lo que se publica).
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'description', s.description
    )
    order by s.position
  ), '[]'::jsonb)
  into v_sections
  from public.sections s
  where s.project_id = v_project.id;

  -- Título, descripción, fecha de vencimiento, fecha límite, prioridad y
  -- si está completada (D-E) de cada tarea del proyecto — todas, sin
  -- filtrar por sección ni por padre: `section_id`/`parent_id` viajan para
  -- que el cliente arme el árbol (secciones -> tareas -> subtareas, sin
  -- límite de niveles, igual que hace lib/tasks/tree.ts del lado privado),
  -- no como un dato publicado en sí. `completed` es un booleano
  -- (`completed_at is not null`), no el timestamp: D-E pide "si está
  -- completada", no cuándo. Nada de comentarios, recordatorios, etiquetas,
  -- duración estimada, posición, ni `user_id`: no están en esta lista y
  -- por eso no salen.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'section_id', t.section_id,
      'parent_id', t.parent_id,
      'title', t.title,
      'description', t.description,
      'due_date', t.due_date,
      'due_at', t.due_at,
      'deadline', t.deadline,
      'priority', t.priority,
      'completed', (t.completed_at is not null)
    )
    order by t.position
  ), '[]'::jsonb)
  into v_tasks
  from public.tasks t
  where t.project_id = v_project.id;

  return jsonb_build_object(
    'project', jsonb_build_object(
      'name', v_project.name,
      'color', v_project.color,
      'icon', v_project.icon
    ),
    'sections', v_sections,
    'tasks', v_tasks
  );
end;
$$;

-- CREATE FUNCTION otorga EXECUTE a PUBLIC por defecto: se revoca y se
-- otorga solo a `anon`. Es la única función del esquema con este grant —
-- ni `authenticated` ni `service_role` lo necesitan para nada (la app
-- logueada nunca llama a esta función; D-F: la vista pública no usa la
-- sesión de quien mira para nada, ni siquiera para decidir el rol con el
-- que llama a esto — ver app/enlace/[token]/page.tsx, que usa un cliente
-- sin cookies a propósito).
revoke execute on function public.get_shared_project(text) from public;
grant execute on function public.get_shared_project(text) to anon;
