-- Cambio `mas-campos-en-el-lenguaje-de-consulta`: cinco ramas nuevas en
-- `ast_to_sql` — `deadline`, `section`, `project_tree`, `no_label`, y el
-- valor `notime` de `due` — sobre la función creada en
-- 20260729130000_buscar_tareas.sql. `buscar_tareas` en sí no cambia de
-- firma ni de cuerpo: solo se reemplaza `ast_to_sql`, que es quien resuelve
-- cada campo del AST. Sigue `security invoker`, `set search_path = ''`, y
-- el mismo `create or replace` no altera los `grant`/`revoke` ya
-- otorgados en la migración original (una función reemplazada conserva
-- sus privilegios mientras no cambie de firma).
--
-- `deadline` (D-A de design.md): mismo análisis de valores que `due` —
-- mismas palabras clave, misma fecha exacta, mismo `before:`/`after:` —
-- pero sobre la columna `deadline` (`date`, sin equivalente a `due_at`),
-- así que no tiene una rama `notime`: `deadline` nunca tiene hora, y D-D
-- deja esa pregunta como exclusiva de `due`.
--
-- `section` (D-C): compara por nombre, igual que `label` y `project`, y por
-- eso cruza proyectos a propósito — dos proyectos pueden tener una sección
-- "Por hacer" y las dos entran. Quien quiera acotar combina
-- `project:X & section:Y`.
--
-- `project_tree` (D-B): `project` NUNCA cambia de significado — sigue
-- comparando el nombre exacto, sin descendientes. `project_tree` es un
-- campo aparte que resuelve la subárbol completo con una CTE recursiva
-- (`with recursive`) que no depende de la fila (`t.project_id in (...)`
-- en vez de un `exists` correlacionado), así que Postgres la resuelve una
-- sola vez por consulta y no por fila.
--
-- `no_label`: mismo patrón que `no_project`, con la ausencia de cualquier
-- fila en `task_labels` para la tarea, igual que la rama existente de
-- `label` filtra por `tl.user_id = t.user_id` (segunda línea de defensa
-- bajo RLS, no la única).
--
-- `due:notime`: `due_date` y `due_at` son excluyentes por decisión D9 de
-- docs/decisions.md, así que "fecha presente y hora ausente" es
-- exactamente `t.due_date is not null` — una tarea sin ninguna fecha tiene
-- `due_date` y `due_at` los dos en null, así que nunca entra acá.
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
  section_values text[];
  project_tree_values text[];
  due_condition jsonb;
  due_kind text;
  deadline_condition jsonb;
  deadline_kind text;
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

    when 'no_label' then
      return format(
        '%L::boolean = (not exists (select 1 from public.task_labels tl where tl.task_id = t.id and tl.user_id = t.user_id))',
        (ast ->> 'value')::boolean
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

    when 'project_tree' then
      select array_agg(lower(extensions.unaccent(v))) into project_tree_values
      from jsonb_array_elements_text(ast -> 'values') as v;

      if project_tree_values is null or array_length(project_tree_values, 1) is null then
        raise exception 'AST inválido: "project_tree" requiere al menos un valor.';
      end if;

      -- `t.project_id in (...)` en vez de `exists (...) and p.id = t.project_id`:
      -- la subconsulta no depende de la fila, así que Postgres la resuelve
      -- una sola vez para toda la consulta, no por cada tarea. La CTE
      -- recursiva baja de los proyectos raíz encontrados por nombre hasta
      -- sus descendientes, a cualquier profundidad.
      return format(
        't.project_id in (' ||
          'with recursive raiz as (' ||
            'select p.id from public.projects p where lower(extensions.unaccent(p.name)) = any (%L::text[])' ||
          '), descendientes as (' ||
            'select id from raiz ' ||
            'union all ' ||
            'select p.id from public.projects p join descendientes d on p.parent_id = d.id' ||
          ') select id from descendientes' ||
        ')',
        project_tree_values
      );

    when 'section' then
      select array_agg(lower(extensions.unaccent(v))) into section_values
      from jsonb_array_elements_text(ast -> 'values') as v;

      if section_values is null or array_length(section_values, 1) is null then
        raise exception 'AST inválido: "section" requiere al menos un valor.';
      end if;

      return format(
        'exists (select 1 from public.sections s where s.id = t.section_id and lower(extensions.unaccent(s.name)) = any (%L::text[]))',
        section_values
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
        when 'notime' then
          -- Fecha presente y hora ausente (D-D): due_date y due_at son
          -- excluyentes por decisión D9, así que "hay fecha sin hora" es
          -- exactamente "due_date está" — una tarea sin ninguna fecha tiene
          -- los dos en null, así que nunca entra acá (para eso está
          -- due:nodate).
          return 't.due_date is not null';
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

    when 'deadline' then
      deadline_condition := ast -> 'condition';
      deadline_kind := deadline_condition ->> 'kind';
      today_local := (at at time zone tz)::date;

      case deadline_kind
        when 'today' then
          return format('t.deadline = %L::date', today_local);
        when 'tomorrow' then
          return format('t.deadline = %L::date', today_local + 1);
        when 'overdue' then
          return format('t.deadline is not null and t.deadline < %L::date', today_local);
        when 'nodate' then
          return 't.deadline is null';
        when 'next7days' then
          return format('t.deadline between %L::date and %L::date', today_local, today_local + 7);
        when 'next30days' then
          return format('t.deadline between %L::date and %L::date', today_local, today_local + 30);
        when 'exact' then
          return format('t.deadline = %L::date', (deadline_condition ->> 'date')::date);
        when 'before' then
          return format(
            't.deadline is not null and t.deadline < %L::date',
            (deadline_condition ->> 'date')::date
          );
        when 'after' then
          return format(
            't.deadline is not null and t.deadline > %L::date',
            (deadline_condition ->> 'date')::date
          );
        else
          raise exception 'AST inválido: condición de "deadline" desconocida "%".', deadline_kind;
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
