## Context

- `lib/search/use-search.ts`: `.textSearch("search_vector", term, { type: "plain", config: "spanish_unaccent" })`.
- `lib/filters/use-filter-results.ts`: parsea con `lib/query-language/parse.ts` y llama `supabase.rpc("buscar_tareas", { ast })`.
- `lib/query-language/errors.ts` ya produce los mensajes en español con posición.

Las dos rutas devuelven filas con `TASK_LIST_COLUMNS`, así que el resultado se
pinta con el mismo componente sin tocarlo.

## Goals / Non-Goals

**Goals:** que escribir `priority:1 & due:overdue` en el buscador haga lo que dice, sin
duplicar ni el parser ni la evaluación.

**Non-Goals:** un modo mixto (texto libre + campos en la misma consulta),
corregir tipeos, y tocar el lenguaje de consulta.

## Decisions

### D-A — Se detecta la consulta, no se elige el modo con un botón

Un selector "texto / consulta" obliga a saber de antemano qué se va a escribir
y agrega un control a una paleta que hoy es una sola caja. En cambio: si lo
escrito **parsea** como consulta válida, se resuelve como consulta; si no,
como texto.

**El caso ambiguo importa:** buscar la palabra `label` o `due` como texto
suelto no parsea como consulta (le falta la forma `campo:valor`), así que cae
en texto, que es lo que la persona quería. La ambigüedad real aparecería con
algo como `project:casa` escrito con intención literal, que es rarísimo — y si
pasa, el resultado sigue siendo útil.

### D-B — Un error de sintaxis no vacía la pantalla

Si lo escrito **parece** una consulta pero tiene un error —`priority:9`, un
paréntesis sin cerrar—, no se cae a búsqueda de texto en silencio: se muestra
el error en español con su posición, igual que al editar un filtro.

Caer a texto escondería el error y devolvería cero resultados sin explicar por
qué, que es peor que decir "te falta cerrar un paréntesis".

### D-C — Guardar como filtro cierra el círculo

Quien escribió una consulta buena en el buscador quiere guardarla. Hoy tiene
que ir a Filtros y reescribirla. La acción reusa la mutación de alta de filtro
que ya existe, precargando la consulta.

## Risks / Trade-offs

**[Detectar por parseo puede sorprender]** → D-A: el caso ambiguo es raro y su
resultado sigue siendo útil. Si en uso molesta, la salida es un prefijo
explícito, no un selector.

**[Dos rutas de consulta con distinto tope de resultados]** → El buscador
limita a 50; los filtros no necesariamente. Igualar el tope en la rama de
consulta del buscador, para que el spec de "hasta 50 resultados" siga siendo
cierto en los dos modos.
