## Context

`tasks` forma un árbol por `parent_id` (`on delete cascade`) y cuelga de un
proyecto por `project_id`. La base no impide que una subtarea quede en un
proyecto distinto al de su padre ni que se forme un ciclo: esas reglas viven
solo en el cliente. El servidor MCP escribe sobre las mismas tablas sin pasar
por los hooks de la interfaz, y varias operaciones compuestas (mover, restaurar,
reemplazar etiquetas, generar la ocurrencia siguiente) son varias llamadas
sueltas a PostgREST sin transacción.

Restricción operativa: `.env.local` apunta a producción y `git push` despliega
el código pero no la base. Una migración obligaría a coordinar un
`supabase db push` manual antes del despliegue.

## Goals / Non-Goals

**Goals:**

- Que ninguna de las siete operaciones deje datos inconsistentes en silencio.
- Una sola implementación de cada regla, compartida por la interfaz y el MCP.
- Cada corrección cubierta por un test que falle sin ella.

**Non-Goals:**

- Garantías a nivel de base (trigger contra ciclos, RPC transaccionales, una
  columna de serie para la recurrencia). Quedan como seguimiento.
- Reparar árboles inconsistentes que ya existan en producción.
- Los demás hallazgos de la auditoría (botón de móvil, búsqueda, invalidación
  de vistas, push tras cerrar sesión).

## Decisions

### D-A. Sin migraciones

Todo se corrige en TypeScript. Alternativa descartada: un trigger que valide
`parent_id`/`project_id` y funciones RPC para las operaciones compuestas. Es más
sólido, pero acopla el despliegue a un paso manual sobre producción y este
cambio busca cerrar los daños ya. La validación en la base queda anotada como
seguimiento.

### D-B. La cascada de proyecto lee de la base

Módulo nuevo `lib/tasks/move-subtree.ts`:

- `fetchDescendants(supabase, rootId)` devuelve los descendientes con
  `id, parent_id, project_id, section_id`, usando `fetchTaskSubtree`.
- `cascadeProjectToDescendants(supabase, descendantIds, toProjectId)` hace el
  `update({ project_id, section_id: null })`.

`useMoveTask`, `useBulkMoveTasks` y `editar` del MCP usan estas dos funciones.
El parche optimista del caché no cambia: sigue usando lo que haya cargado.

### D-C. Deshacer el movimiento en lote con foto de la base

`useBulkMoveTasks` arma la foto dentro de `mutationFn`, antes de mover: la fila
de cada tarea seleccionada (`project_id, section_id, parent_id, position`) y la
de cada descendiente (`project_id, section_id`). `mutationFn` devuelve esa foto
y `onSuccess` la usa para el deshacer. El deshacer restaura raíces y
descendientes, revisa el `error` de cada respuesta y, si alguna falla, llama a
`reportTaskError` una vez. Se elimina la foto tomada del caché en `onMutate`,
que quedaba vacía cuando el proyecto de origen no estaba cargado.

### D-D. Validación de ubicación en el MCP

Módulo nuevo `lib/mcp/tools/task-placement.ts` con una función que recibe la
ubicación resultante (`project_id`, `section_id`, `parent_id`) y el id de la
tarea si ya existe, y devuelve `{ ok: true }` o `{ ok: false, error }`. Reglas:

1. El proyecto existe (la RLS ya limita a los del usuario).
2. La sección, si hay, pertenece a ese proyecto.
3. El padre, si hay, existe y está en ese mismo proyecto.
4. El padre no es la propia tarea ni uno de sus descendientes.

`editar` calcula la ubicación resultante combinando la fila actual con el
parche, y valida solo si el parche toca alguno de los tres campos. Si cambia
`project_id`, después del `update` arrastra los descendientes (D-B). Una
combinación inválida se rechaza con un mensaje que dice qué campo corregir; no
se corrige sola, para que el asistente no mueva tareas sin pedirlo.

`crear_tarea` con `parent_id`: la tarea hereda el `project_id` del padre y
queda sin sección, salvo que se indique una de ese proyecto. Si el texto o `project_id` indican otro proyecto, se
rechaza. Hoy una subtarea creada sin proyecto cae en la Bandeja de entrada,
lejos de su padre.

### D-E. `fetchTaskSubtree` con conjunto de visitados

El recorrido descarta los ids ya vistos, así un ciclo existente termina. No se
lanza error: borrar o duplicar un árbol dañado tiene que seguir funcionando.

### D-F. Una ocurrencia siguiente por completado

Dos defensas, porque no hay columna que identifique la serie:

1. `completar_tarea` actualiza con la condición `completed_at is null` (o
   `not is null` al descompletar) y pide las filas afectadas. Si no cambió
   ninguna, la tarea ya estaba en ese estado: responde `ok` sin generar nada.
2. `createNextRecurringOccurrence`, antes de insertar, busca una tarea
   pendiente del mismo usuario con el mismo `project_id`, `parent_id`, `title`,
   `recurrence_rule` y la misma fecha planificada (`due_date` o `due_at`). Si
   existe, no crea otra y devuelve `null`.

Devolver `null` en el caso 2 es deliberado: el deshacer de la interfaz solo
borra la ocurrencia que ese mismo completado creó.

Alternativa descartada: que descompletar borre la ocurrencia siguiente. La
contradice el escenario "Descompletar nunca revive ni borra la siguiente
ocurrencia" del MCP, y descompletar puede ocurrir días después.

Límite conocido: dos tareas recurrentes idénticas (mismo título, regla,
proyecto y padre) cuya fecha siguiente coincida se tratan como la misma serie.

### D-G. Fin de la serie medido contra la ocurrencia nueva

`nextOccurrence` devuelve `null` cuando la regla no tiene más fechas, en vez de
caer en `dtstart`. `planNextOccurrence` devuelve `null` en ese caso y también
cuando el instante de la ocurrencia planificada es posterior a
`recurrence_ends_at`. Para una ocurrencia sin hora se compara el inicio de ese
día en la zona del usuario; `recurrence_ends_at` se guarda como fin del día
elegido (`lib/recurrence/ends-at.ts`), así que el último día queda incluido. Se
conserva la comparación contra `now`.

### D-H. Recordatorios en la foto de borrado

`TaskSnapshot` suma `reminders` (`id, user_id, task_id, remind_at,
offset_minutes, delivered_at`). `restoreTaskSnapshot` los inserta después de
las tareas. Las tres inserciones dependientes (etiquetas, comentarios,
recordatorios) se intentan todas aunque una falle; al final se lanza el primer
error. Así una falla en etiquetas no impide recuperar comentarios y
recordatorios, y quien llama muestra el error.

### D-I. Reemplazo de etiquetas por diferencia

Módulo nuevo `lib/tasks/replace-labels.ts`:
`replaceTaskLabels(supabase, taskId, labelIds, userId)` lee las asignaciones
actuales, inserta las que faltan y después borra las que sobran. Si la
inserción falla no se perdió nada; si falla el borrado quedan etiquetas de más,
nunca de menos. Lo usan `useReplaceTaskLabels` y `editar` del MCP. El resultado
observable sigue siendo "el conjunto queda reemplazado".

### D-J. Etiquetas que no se pudieron copiar a una tarea nueva

En `crear_tarea` y `createNextRecurringOccurrence` la tarea ya existe cuando se
insertan sus etiquetas. No se compensa borrando: un token OAuth no puede borrar
tareas (RLS), y en la recurrencia el llamador necesita el id para el deshacer.
En cambio:

- `createNextRecurringOccurrence` devuelve la ocurrencia con
  `labelsFailed: true`; `useUpdateTask` muestra un aviso y `completar_tarea` lo
  incluye en su respuesta.
- `crear_tarea` devuelve `ok: true` con la tarea sin etiquetas y un campo
  `aviso` que lo explica.

## Risks / Trade-offs

- [Las reglas siguen sin garantía en la base] → Cualquier escritura futura que
  no pase por estos módulos puede romperlas. Mitigación: módulos compartidos y
  el trigger anotado como seguimiento.
- [Más lecturas por operación: mover hace un recorrido del subárbol] → Una
  consulta por nivel de anidamiento; aceptable para árboles de pocas decenas de
  tareas.
- [El criterio de D-F es heurístico] → Puede no generar la ocurrencia de una
  tarea gemela. Documentado como límite.
- [Operaciones sin transacción] → Una falla intermedia sigue siendo posible; el
  orden elegido en cada caso deja el estado menos dañino y se informa.
- [`.env.local` apunta a producción] → Sin e2e ni servidor local: la
  verificación es con tests unitarios y el gate; queda sin probar en navegador.

## Migration Plan

Sin migración de esquema. Despliegue normal por `git push`. Reversión:
revertir los commits; no hay datos que convertir.

## Open Questions

Ninguna que bloquee. Seguimiento sugerido: trigger en `tasks` contra ciclos y
proyecto distinto al del padre.
