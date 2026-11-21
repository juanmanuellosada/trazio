## Why

La auditoría del 2026-11-21 encontró siete defectos que dejan datos
inconsistentes sin avisar: subtareas que quedan en otro proyecto, árboles con
ciclos, ocurrencias recurrentes duplicadas o fuera de la serie, recordatorios
perdidos al deshacer y tareas que pierden todas sus etiquetas. Comparten una
causa: operaciones sobre una tarea que olvidan sus filas relacionadas, o que
confían en el caché del cliente en vez de la base.

## What Changes

- **Mover a otro proyecto**: las subtareas a arrastrar se leen de la base, no
  del caché del proyecto de origen. Aplica a mover una tarea y a mover en lote.
- **Deshacer un movimiento en lote**: devuelve también las subtareas a su
  proyecto y sección de origen, y avisa si alguna actualización falla. La foto
  previa sale de la base, así que también funciona desde Hoy, una etiqueta o
  la búsqueda.
- **Servidor MCP**: `editar` y `crear_tarea` validan `project_id`,
  `section_id` y `parent_id` antes de escribir; rechazan ciclos y padres o
  secciones de otro proyecto; al cambiar de proyecto arrastran las subtareas.
  `crear_tarea` con `parent_id` hereda el proyecto del padre.
- **Recorrido del subárbol**: `fetchTaskSubtree` termina aunque haya un ciclo
  ya guardado.
- **Completar dos veces una tarea recurrente** no duplica la ocurrencia
  siguiente, ni desde la interfaz ni desde `completar_tarea`.
- **Fin de la serie**: no se crea una ocurrencia posterior a
  `recurrence_ends_at`, ni una ocurrencia vencida cuando la regla ya no tiene
  fechas.
- **Borrar y deshacer** restaura también los recordatorios, y una falla
  parcial al restaurar se informa en vez de quedar en silencio.
- **Reemplazar etiquetas** deja de borrar todo antes de insertar: agrega las
  nuevas y recién después quita las que sobran. Una falla al copiar etiquetas
  en `crear_tarea` o en la ocurrencia siguiente se informa sin perder la tarea.

Sin migraciones: todo se resuelve en la capa de aplicación.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tareas`: mover una tarea a otro proyecto arrastra todo su subárbol sin
  depender de qué vistas se hayan cargado; el recorrido de un subárbol termina
  siempre.
- `seleccion-multiple`: deshacer un movimiento en lote devuelve las tareas y
  sus subtareas a su lugar de origen.
- `tareas-recurrentes`: una ocurrencia siguiente por completado, y ninguna
  posterior al fin de la serie.
- `deshacer`: restaurar una tarea eliminada restaura sus recordatorios y
  avisa de una restauración parcial.
- `etiquetas`: reemplazar el conjunto de etiquetas nunca deja a la tarea sin
  las etiquetas que conservaba.
- `mcp`: las herramientas de escritura validan la ubicación de una tarea en el
  árbol y `completar_tarea` es idempotente. La capacidad `mcp` todavía vive en
  el change `servidor-mcp` sin archivar, así que acá entra como requisitos
  agregados.

## Impact

- `lib/tasks/subtree.ts`, `lib/tasks/mutations.ts` (`useMoveTask`,
  `useBulkMoveTasks`, `useReplaceTaskLabels`, `useUpdateTask`),
  `lib/tasks/restore.ts`.
- Módulos nuevos en `lib/tasks/` para la cascada de proyecto y el reemplazo de
  etiquetas, compartidos por la interfaz y el servidor MCP.
- `lib/recurrence/next.ts`, `series.ts`, `create-next-occurrence.ts`.
- `lib/mcp/tools/editar.ts`, `crear-tarea.ts`, `completar-tarea.ts`.
- Sin cambios de esquema, de dependencias ni de interfaz visible, salvo
  mensajes de error nuevos.
