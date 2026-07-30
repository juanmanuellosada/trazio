-- buscar_tareas: evaluación en Postgres del lenguaje de consulta (D-A de
-- design.md, capacidad `lenguaje-de-consulta`). El AST lo produce y valida
-- `lib/query-language/` en el cliente (esquema Zod en `ast.ts`) y viaja acá
-- como `jsonb`; esta función lo vuelve a validar del lado del servidor, sin
-- confiar en que el llamador haya sido el parser propio.
--
-- A diferencia de una primera versión que evaluaba el AST fila por fila con
-- un `case` recursivo (correcta pero ciega a los índices: cada consulta
-- hacía un scan completo de las tareas del usuario), esta versión **compila
-- el AST a un predicado SQL** (`ast_to_sql`) que se ejecuta una sola vez con
-- `execute`, lo que sí deja que el planner use el btree de `user_id` para
-- acotar antes de filtrar. El GIN de `search_vector` queda afuera de esa
-- mejora: bajo RLS el planner no lo usa para ningún camino de evaluación,
-- por el motivo que explica el comentario del campo `search` más abajo. La
-- seguridad se mantiene igual que antes, por otro camino:
--   - Los nombres de campo y la forma de cada predicado salen de una lista
--     blanca fija en el código de la función (el `case field_name` de acá
--     abajo). Ningún identificador de columna ni de tabla viene del AST.
--   - Todo valor del usuario entra al SQL compilado vía `format(..., %L)`,
--     nunca por concatenación de texto suelta.
--   - Un tipo de nodo o un campo desconocido sigue haciendo `raise
--     exception`, igual que antes.
--   - Sigue siendo `SECURITY INVOKER`: la RLS de `tasks` (y de
--     `task_labels`/`projects`, referenciadas dentro del predicado
--     compilado) sigue activa con el rol del usuario autenticado, así que
--     el filtro explícito por `user_id` es una segunda línea de defensa, no
--     la única.
--
-- `ast_to_sql` es recursiva: los nodos `and`/`or`/`not` combinan el texto
-- SQL de sus hijos entre paréntesis, y son los que le dan a `!campo:valor`
-- su semántica de no-existencia (D-A/D-B): niega el mismo `exists (...)`
-- que produce el campo, sin necesitar un operador `!=` aparte que PostgREST
-- no podría componer.
--
-- `tz` es la zona horaria IANA del usuario (`user_preferences.timezone`,
-- D8 de decisions.md): los campos `due:` y `created:` la usan para calcular
-- "hoy" en el día del usuario, no en UTC — antes usaban `current_date`
-- (UTC), así que a las 22:00 en Argentina (UTC-3) `due:today` ya devolvía
-- las tareas de mañana. Se resuelve una sola vez en `buscar_tareas` (no en
-- cada nodo) y se pasa hacia abajo.
--
-- `at` es el instante que cuenta como "ahora": por defecto `now()`, como
-- toda consulta real. Se recibe como parámetro (en vez de llamar a `now()`
-- directamente acá) para que los tests puedan fijar un instante exacto
-- (por ejemplo, las 22:00 en `America/Argentina/Buenos_Aires`) y verificar
-- el cálculo de "hoy" sin depender de la hora real a la que corra la
-- suite — Postgres no tiene forma de "congelar" `now()` para un test.
create or replace function public.ast_to_sql(ast jsonb, tz text, at timestamptz)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  node_type text := ast ->> 'type';
  field_name text;
  priority_values smallint[];
  label_values text[];
  project_values text[];
  due_condition jsonb;
  due_kind text;
  created_condition jsonb;
  created_kind text;
  today_local date;
begin
  if ast is null or node_type is null then
    raise exception 'AST inválido: falta el tipo de nodo.';
  end if;

  if node_type = 'and' then
    return format('(%s) and (%s)', public.ast_to_sql(ast -> 'left', tz, at), public.ast_to_sql(ast -> 'right', tz, at));
  end if;

  if node_type = 'or' then
    return format('(%s) or (%s)', public.ast_to_sql(ast -> 'left', tz, at), public.ast_to_sql(ast -> 'right', tz, at));
  end if;

  if node_type = 'not' then
    return format('not (%s)', public.ast_to_sql(ast -> 'expr', tz, at));
  end if;

  if node_type <> 'field' then
    raise exception 'AST inválido: tipo de nodo desconocido "%".', node_type;
  end if;

  field_name := ast ->> 'field';

  case field_name
    when 'priority' then
      select array_agg(v::smallint) into priority_values
      from jsonb_array_elements_text(ast -> 'values') as v;

      if priority_values is null or array_length(priority_values, 1) is null then
        raise exception 'AST inválido: "priority" requiere al menos un valor.';
      end if;

      return format('t.priority = any (%L::smallint[])', priority_values);

    when 'label' then
      select array_agg(lower(extensions.unaccent(v))) into label_values
      from jsonb_array_elements_text(ast -> 'values') as v;

      if label_values is null or array_length(label_values, 1) is null then
        raise exception 'AST inválido: "label" requiere al menos un valor.';
      end if;

      return format(
        'exists (select 1 from public.task_labels tl join public.labels l on l.id = tl.label_id ' ||
        'where tl.task_id = t.id and tl.user_id = t.user_id and lower(extensions.unaccent(l.name)) = any (%L::text[]))',
        label_values
      );

    when 'project' then
      select array_agg(lower(extensions.unaccent(v))) into project_values
      from jsonb_array_elements_text(ast -> 'values') as v;

      if project_values is null or array_length(project_values, 1) is null then
        raise exception 'AST inválido: "project" requiere al menos un valor.';
      end if;

      return format(
        'exists (select 1 from public.projects p where p.id = t.project_id and lower(extensions.unaccent(p.name)) = any (%L::text[]))',
        project_values
      );

    when 'completed' then
      return format('%L::boolean = (t.completed_at is not null)', (ast ->> 'value')::boolean);

    when 'recurring' then
      return format('%L::boolean = (t.recurrence_rule is not null)', (ast ->> 'value')::boolean);

    when 'subtask' then
      return format('%L::boolean = (t.parent_id is not null)', (ast ->> 'value')::boolean);

    when 'no_project' then
      return format(
        '%L::boolean = exists (select 1 from public.projects p where p.id = t.project_id and p.is_inbox = true)',
        (ast ->> 'value')::boolean
      );

    when 'search' then
      -- Mismo search_vector y misma configuración spanish_unaccent que
      -- `buscador` (D-B): el requirement "Campo search usa el mismo motor
      -- que el buscador" exige que sea, literalmente, el mismo mecanismo.
      -- `@@` contra `search_vector` NO hace que el planner use
      -- `tasks_search_vector_idx` (GIN) bajo RLS: `ts_match_vq` (la función
      -- detrás de `@@`) no está marcada `LEAKPROOF`, y Postgres no empuja un
      -- operador no-leakproof como condición de índice antes de aplicar la
      -- política de fila para un rol no-superusuario. El acceso real es por
      -- el btree de `user_id`, con este `tsquery` aplicado después como
      -- filtro fila por fila — aceptado y documentado en D36 de
      -- docs/decisions.md.
      if ast ->> 'value' is null then
        raise exception 'AST inválido: "search" requiere un valor.';
      end if;

      return format(
        't.search_vector @@ plainto_tsquery(''extensions.spanish_unaccent''::regconfig, %L)',
        ast ->> 'value'
      );

    when 'due' then
      due_condition := ast -> 'condition';
      due_kind := due_condition ->> 'kind';
      today_local := (at at time zone tz)::date;

      case due_kind
        when 'today' then
          return format('coalesce(t.due_date, t.due_at::date) = %L::date', today_local);
        when 'tomorrow' then
          return format('coalesce(t.due_date, t.due_at::date) = %L::date', today_local + 1);
        when 'overdue' then
          return format(
            'coalesce(t.due_date, t.due_at::date) is not null and coalesce(t.due_date, t.due_at::date) < %L::date',
            today_local
          );
        when 'nodate' then
          return 't.due_date is null and t.due_at is null';
        when 'next7days' then
          return format(
            'coalesce(t.due_date, t.due_at::date) between %L::date and %L::date',
            today_local, today_local + 7
          );
        when 'next30days' then
          return format(
            'coalesce(t.due_date, t.due_at::date) between %L::date and %L::date',
            today_local, today_local + 30
          );
        when 'exact' then
          return format('coalesce(t.due_date, t.due_at::date) = %L::date', (due_condition ->> 'date')::date);
        when 'before' then
          return format(
            'coalesce(t.due_date, t.due_at::date) is not null and coalesce(t.due_date, t.due_at::date) < %L::date',
            (due_condition ->> 'date')::date
          );
        when 'after' then
          return format(
            'coalesce(t.due_date, t.due_at::date) is not null and coalesce(t.due_date, t.due_at::date) > %L::date',
            (due_condition ->> 'date')::date
          );
        else
          raise exception 'AST inválido: condición de "due" desconocida "%".', due_kind;
      end case;

    when 'created' then
      created_condition := ast -> 'condition';
      created_kind := created_condition ->> 'kind';

      case created_kind
        when 'exact' then
          return format('(t.created_at at time zone %L)::date = %L::date', tz, (created_condition ->> 'date')::date);
        when 'before' then
          return format('(t.created_at at time zone %L)::date < %L::date', tz, (created_condition ->> 'date')::date);
        when 'after' then
          return format('(t.created_at at time zone %L)::date > %L::date', tz, (created_condition ->> 'date')::date);
        else
          raise exception 'AST inválido: condición de "created" desconocida "%".', created_kind;
      end case;

    else
      raise exception 'AST inválido: campo desconocido "%".', field_name;
  end case;
end;
$$;

-- Recorre el AST buscando si en algún punto se menciona el campo
-- `completed`, sin importar cuánto anidamiento de and/or/not haya encima
-- (D-A: "completed afuera por defecto si la consulta no lo menciona" tiene
-- que valer para toda la consulta, no solo para su nodo raíz). Se evalúa
-- una sola vez en `buscar_tareas`, no por fila.
create or replace function public.ast_mentions_completed(ast jsonb)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select case ast ->> 'type'
    when 'field' then (ast ->> 'field') = 'completed'
    when 'not' then public.ast_mentions_completed(ast -> 'expr')
    when 'and' then public.ast_mentions_completed(ast -> 'left') or public.ast_mentions_completed(ast -> 'right')
    when 'or' then public.ast_mentions_completed(ast -> 'left') or public.ast_mentions_completed(ast -> 'right')
    else false
  end;
$$;

-- Punto de entrada expuesto como RPC. `security invoker`: la RLS de `tasks`
-- (y de `task_labels`/`projects`, referenciadas dentro del predicado
-- compilado) sigue activa con el rol del usuario autenticado, así que el
-- filtro explícito por `user_id` de acá abajo es una segunda línea de
-- defensa, no la única (mismo patrón que `rebalance_task_positions` en
-- 20260726013250_position_rebalance_functions.sql). `ast_to_sql` compila el
-- AST completo antes de ejecutar nada, así que un AST inválido devuelve
-- error incluso si el usuario todavía no tiene ninguna tarea.
--
-- `at`: ver el comentario de `ast_to_sql` — por defecto `now()`, solo se
-- fija a otro valor desde los tests.
create or replace function public.buscar_tareas(ast jsonb, at timestamptz default now())
returns setof public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  tz text;
  predicate text;
  completed_mentioned boolean;
  compiled_sql text;
begin
  select coalesce(up.timezone, 'America/Argentina/Buenos_Aires') into tz
  from public.user_preferences up
  where up.user_id = (select auth.uid());

  tz := coalesce(tz, 'America/Argentina/Buenos_Aires');

  predicate := public.ast_to_sql(ast, tz, at);
  completed_mentioned := public.ast_mentions_completed(ast);

  compiled_sql := format(
    'select t.* from public.tasks t where t.user_id = %L::uuid and (%s) and (%L::boolean or t.completed_at is null)',
    (select auth.uid()), predicate, completed_mentioned
  );

  return query execute compiled_sql;
end;
$$;

-- CREATE FUNCTION otorga EXECUTE a PUBLIC por defecto (ver el comentario de
-- 20260726013239_security_revoke_trigger_execute.sql): se revoca y se
-- vuelve a otorgar de forma explícita solo a `authenticated`, que es el
-- único rol que puede invocar buscar_tareas vía PostgREST.
revoke execute on function public.ast_to_sql(jsonb, text, timestamptz) from public;
revoke execute on function public.ast_mentions_completed(jsonb) from public;
revoke execute on function public.buscar_tareas(jsonb, timestamptz) from public;

grant execute on function public.ast_to_sql(jsonb, text, timestamptz) to authenticated;
grant execute on function public.ast_mentions_completed(jsonb) to authenticated;
grant execute on function public.buscar_tareas(jsonb, timestamptz) to authenticated;
