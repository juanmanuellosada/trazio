## Context

`QUERY_FIELDS` en `lib/query-language/ast.ts` es la lista blanca del parser.
`buscar_tareas(ast jsonb, at timestamptz)` la evalúa en SQL, `security
invoker`, devolviendo `setof public.tasks`.

`field-reference.ts` deriva de `QUERY_FIELDS` con un `Record<QueryField, …>`,
así que agregar un campo sin documentarlo **no compila**.

## Goals / Non-Goals

**Goals:** consultar lo que el modelo ya guarda.

**Non-Goals:** cambiar el significado de un campo existente, comodines,
listas separadas, y campos de colaboración.

## Decisions

### D-A — `deadline` copia la forma de `due`, no inventa una propia

Mismos valores (`today`, `overdue`, `nodate`, `next7days`…), mismo
`before:`/`after:`. Son dos fechas de la misma tarea con la misma pregunta
detrás; que se consulten distinto sería una trampa de memoria.

### D-B — `project_tree` es un campo aparte, no un cambio en `project`

Todoist distingue `#proyecto` de `##proyecto`. Acá los sigilos no encajan: la
gramática es `campo:valor` y no hay prefijos.

**Y `project` no puede cambiar de significado.** Hay filtros guardados que
dependen de que compare el nombre exacto; hacerlo recursivo cambiaría en
silencio lo que devuelven, sin que nadie los toque. Un campo nuevo es
aditivo: quien lo quiere lo escribe.

### D-C — `section` compara por nombre, y eso cruza proyectos

Dos proyectos pueden tener una sección "Por hacer". `section:Por hacer` va a
traer las tareas de las dos.

Es el mismo comportamiento que ya tiene `label` y `project` —comparan nombre,
no identidad— así que es consistente. Y quien quiera acotar tiene
`project:Casa & section:Por hacer`, que se lee solo.

Alternativa descartada: exigir que `section` venga siempre acompañado de
`project`. Es más preciso y es una regla que hay que aprender; el lenguaje no
tiene ninguna otra dependencia entre campos y no vale estrenarla acá.

### D-D — "sin hora" es un valor de `due`, no un campo

`due` ya acepta `nodate`. `notime` vive en el mismo espacio: es una pregunta
sobre la fecha de vencimiento, no sobre otra cosa. Un campo `has_time` aparte
partiría en dos lo que conceptualmente es una sola dimensión, y obligaría a
explicar por qué `due:nodate` y `has_time:false` conviven.

Ojo con el borde: `due:notime` significa **con fecha y sin hora**, no "sin
hora" a secas. Una tarea sin ninguna fecha es `due:nodate`, y NUNCA debería
aparecer en `due:notime`.

### D-E — El compilador obliga a documentar

No hace falta disciplina: `QUERY_FIELD_REFERENCE` es un `Record<QueryField, …>`
y agregar un campo sin su entrada rompe el typecheck. Es lo que se construyó
ayer justamente para que la ayuda no envejezca mintiendo, y esta es su primera
prueba real.

## Risks / Trade-offs

**[`section` cruzando proyectos puede sorprender]** → D-C: es consistente con
`label` y `project`, y la referencia del modal lo dice en su descripción.

**[La función SQL crece]** → `buscar_tareas` gana cinco ramas. Si el evaluador
se vuelve difícil de leer, la salida es reordenarlo, no repartir la evaluación
entre SQL y el cliente: partirla haría que dos lugares tengan que coincidir.

**[Migración además de código]** → El despliegue necesita `supabase db push`
antes de `git push`, con el orden que ya se usó tres veces.
