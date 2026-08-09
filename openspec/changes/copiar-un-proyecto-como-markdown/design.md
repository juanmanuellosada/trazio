## Context

La descripción de una tarea se guarda como **JSONB de Tiptap**, no como HTML
ni como markdown — hace falta un conversor propio. `TASK_LIST_COLUMNS`
(`lib/tasks/task-columns.ts`) es el `select` que alimenta Bandeja, Hoy,
Próximos, Proyecto, Etiqueta, Filtro y Buscador; no trae la descripción
porque el jsonb es pesado y la mayoría de esas pantallas no la necesita.
`lib/public-project/build-tree.ts` ya resuelve el mismo problema de anidar
tareas por `parent_id` preservando orden para la vista pública de solo
lectura (`enlace-de-lectura-de-un-proyecto`); esta feature necesita la misma
forma de árbol, así que conviene generalizarla en vez de duplicarla.

## Goals / Non-Goals

**Goals:** copiar un proyecto entero como texto markdown al portapapeles,
con una estructura que se pegue de forma útil en Obsidian, GitHub y Notion.

**Non-Goals:** exportar un archivo, importar markdown, copiar una tarea
sola, atajo de teclado, y cualquier forma de ciclo de portabilidad (D60).

## Decisions

### D-A — Formato: lista de tareas, no headings

Cada tarea y subtarea es un ítem `- [ ]`/`- [x]`, nunca un heading. Es lo que
reconoce el pegado accionable de Obsidian y de GitHub (una lista de tareas
real, con casillero), y anida sin límite de niveles. Un heading se agota en
H6 y, sobre todo, no tiene estado de completada — perdería justo el dato que
D2 y el resto del producto tratan como central.

**Indentación:** 2 espacios por nivel. Es la columna de contenido mínima
válida de una lista en CommonMark (el ancho de `- `) y la que Obsidian,
GitHub y Notion parsean igual. Con 4 espacios, un nivel de anidamiento se
vuelve indistinguible de un bloque de código indentado.

**Metadatos:** en la misma línea que el título de la tarea, después de
` — `, separados entre sí por ` · `. Una línea aparte para cada metadato
obliga a declarar la lista "floja" (`loose`) o, según el motor, produce una
continuación perezosa que un renderer distinto puede no reconocer como parte
del mismo ítem.

**Etiquetas:** `etiquetas: casa, mudanza`, nunca `#casa #mudanza`. Un
hashtag se rompe con un nombre de etiqueta que tiene espacios, y fuera de
Obsidian un `#etiqueta` no significa nada — en GitHub es ruido, en Notion es
texto suelto.

**Sin emojis**, por `.claude/rules/copy.md`.

### D-B — Los títulos se escapan

El título de una tarea es texto plano por decisión de producto (D2, §13.4
"sin markdown en el título"): una tarea que se llama `*urgente*` se pega
literal, no en cursiva. Los caracteres de control de markdown en un título
(o en un nombre de proyecto, sección o etiqueta) se escapan al serializar,
para que el resultado sea siempre texto fiel al dato, nunca una
interpretación accidental de formato que el usuario no pidió.

### D-C — La descripción va como continuación indentada, no como blockquote

Se evaluó prefijar la descripción con `> ` para separarla visualmente de las
subtareas, y se descartó: un blockquote degrada mal en Notion, y anida peor
con las citas que la propia descripción de Tiptap ya puede tener (una cita
dentro de una cita deja de ser legible). En cambio, la descripción se
serializa como texto indentado al mismo nivel que las subtareas de esa
tarea.

**Costo aceptado y registrado:** si una descripción termina en una lista con
viñetas y la tarea además tiene subtareas, los dos listados quedan
indentados al mismo nivel y un renderer los fusiona en un único listado con
ítems mixtos (los de la descripción y los de las subtareas, sin separación
visual entre unos y otros). Es cosmético y es un caso raro — una descripción
que termina justo en una lista, en una tarea que además tiene subtareas — y
no amerita blockquote para evitarlo.

### D-D — `ClipboardItem` con `Promise<Blob>` diferida

Las descripciones no están en el caché de ninguna lista (D-E) y hay que
salir a la red a buscarlas. Pero `await` algo antes de llamar a
`navigator.clipboard.writeText()` rompe la cadena del gesto de usuario:
WebKit —incluida la PWA en iOS— rechaza una escritura al portapapeles que no
ocurre sincrónicamente dentro del handler del clic.

La solución es la que WebKit mismo documentó para este caso: `ClipboardItem`
acepta un `Promise<Blob>` como valor. La llamada a
`navigator.clipboard.write([...])` se hace sincrónica, dentro del handler
del clic, y el blob de texto se resuelve después, cuando la consulta de red
(D-E) termina. Con respaldo a `navigator.clipboard.writeText()` liso en
navegadores donde `ClipboardItem` con blob diferido no existe.

Se suma un *prefetch* de las descripciones al abrir el menú "…", como
defensa en profundidad para que la consulta ya esté en caché cuando se
hace clic — pero no reemplaza el `Promise<Blob>` diferido: sin conexión o
con el prefetch todavía en vuelo, sigue haciendo falta.

### D-E — Las descripciones se traen con una consulta puntual

No se extiende `TASK_LIST_COLUMNS`: ese `select` alimenta Bandeja, Hoy,
Próximos, Proyecto, Etiqueta, Filtro y Buscador, y el jsonb de la
descripción es pesado — cargarlo en todas esas pantallas para una acción que
se usa desde un menú sería pagar memoria y ancho de banda en el camino
caliente para beneficiar el camino frío.

Se descartaron dos alternativas:

- **Una RPC.** Sería una migración para hacer lo que PostgREST ya resuelve
  con RLS: un `select` acotado por `user_id` no necesita una función.
- **Una server action.** No hay un solo `"use server"` en el repositorio, y
  además no resuelve nada: el problema de D-D es el gesto de usuario, no
  dónde corre la consulta.

La consulta lleva `.order("position")` aunque el resultado se consuma como
mapa (`id → descripción`) y no como lista ordenada: así, si un proyecto
llegara al `db-max-rows` de Supabase, trunca el mismo subconjunto de tareas
que ya trunca `fetchTasks` (`lib/tasks/use-tasks.ts`), en vez de un
subconjunto arbitrario y distinto.

### D-F — Limitación conocida de las notas al pie

GitHub solo reconoce una definición de nota al pie (`[^1]: texto`) a nivel
de documento, en la columna cero. Las que arma este conversor quedan
indentadas dentro del ítem de la tarea a la que pertenecen, así que en
GitHub se ven como texto literal en vez de resolverse como nota. En
Obsidian sí funcionan, indentadas o no.

Izar todas las definiciones al final del documento queda como trabajo
futuro. Mientras tanto, las etiquetas de nota al pie llevan un prefijo por
tarea (`[^3-1]`, `[^3-2]`, con `3` el índice de la tarea) para que ese
cambio, el día que se haga, no obligue a renumerar nada.

### D-G — `colspan`/`rowspan` de las tablas se ignoran

Markdown no tiene celdas combinadas. No se intenta simular con celdas
vacías ni con ningún otro truco: la tabla se serializa con las celdas que
tiene, y una celda combinada en el original se repite o se trunca según
cómo Tiptap la exponga. No es un caso que valga resolver para una
conversión de lectura.

### D-H — `formatDuration` se reutiliza desde `lib/landing/format-parse-result.ts`

La duración estimada se formatea con la misma función que ya usa la
landing para mostrarle al usuario "1h 30min". Es genérica —recibe minutos,
devuelve texto— y duplicarla en `lib/projects/` sería peor que importarla
de un módulo que, por nombre, no debería tener nada que ver con proyectos.
Anotado como deuda: un día merece mudarse a un módulo neutro (algo como
`lib/format/duration.ts`) del que puedan depender tanto la landing como la
app sin que el nombre mienta.

## Risks / Trade-offs

**[La descripción y las subtareas se fusionan visualmente cuando la
descripción termina en una lista]** → D-C: costo aceptado, cosmético, caso
raro.

**[Las notas al pie no se resuelven en GitHub]** → D-F: funcionan en
Obsidian, quedan como texto literal en GitHub. Izarlas es trabajo futuro,
sin costo de migración cuando se haga (prefijo por tarea ya puesto).

**[`ClipboardItem` con blob diferido no existe en todos los navegadores]** →
D-D: respaldo a `writeText` liso donde falte.

**[Sin conexión, o con el prefetch todavía en vuelo, la consulta de
descripciones puede fallar dentro del gesto]** → D-D: el `Promise<Blob>`
puede rechazar; ese camino de error se cubre en `tasks.md` (Ola 4) y en el
escenario de "falla la red" del spec delta.
