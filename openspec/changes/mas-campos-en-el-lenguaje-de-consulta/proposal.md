## Why

El lenguaje de consulta tiene diez campos y el modelo de datos tiene más. Hay
cosas que Trazio guarda, muestra y hasta filtra con un clic, pero que no se
pueden consultar:

- **La fecha límite** existe como campo de la tarea y como filtro rápido en la
  barra de opciones, y el lenguaje no la alcanza. Es el hueco más raro: el
  dato está, el filtro de un clic está, y la consulta no.
- **Las secciones** existen y no se pueden consultar.
- **Un proyecto con hijos** no trae lo de abajo: `project:` compara el nombre
  exacto, así que consultar "Casa" deja afuera "Casa / Cocina".
- **"Sin etiqueta"** y **"sin hora"** no se pueden expresar, aunque el modelo
  distingue `due_date` de `due_at` por decisión propia (D9).

Todoist ofrece las cuatro. Y ahora rinde más que antes: la referencia del
lenguaje se ve en el modal, así que cada campo que se suma se descubre solo.

## What Changes

- `deadline` SHALL consultarse con la misma forma que `due`: valores
  equivalentes y `deadline:before:FECHA` / `deadline:after:FECHA`.
- `section` SHALL consultarse por nombre.
- `project_tree` SHALL traer un proyecto **y sus descendientes**. `project`
  NUNCA SHALL cambiar de significado: hay filtros guardados que dependen de
  que compare el nombre exacto.
- `no_label` SHALL consultarse como booleano, con la misma forma que
  `no_project`, que ya existe.
- `due:notime` SHALL seleccionar las tareas con fecha y sin hora, junto a los
  valores que `due` ya acepta. NUNCA SHALL agregarse un campo nuevo para eso:
  es un valor más del espacio que `due` ya cubre.

## Capabilities

### Modified Capabilities

- `lenguaje-de-consulta`: cuatro campos y un valor nuevos.
- `esquema-datos`: la función `buscar_tareas` los evalúa.

## Impact

**Base de datos** — migración que reemplaza `buscar_tareas(ast, at)`. Es
`security invoker` y devuelve `setof tasks`, así que la RLS sigue acotando el
resultado sin cambios. **Necesita `supabase db push`**, no alcanza con
`git push`.

**Parser** — `lib/query-language/ast.ts` (`QUERY_FIELDS`), `parse.ts` y
`validate-values.ts`.

**Referencia** — `lib/query-language/field-reference.ts` deriva de
`QUERY_FIELDS` y su tipo es un `Record` completo, así que **el compilador va a
exigir** documentar cada campo nuevo. Es exactamente para esto que se
construyó.

**Fuera de alcance** — comodines en el texto, comas que produzcan listas
separadas, y todo lo que Todoist ofrece sobre colaboración (asignadas a,
espacio de trabajo, compartidas), que cae en decisiones ya tomadas.
