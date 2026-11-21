## 1. Recorrido y cascada del subárbol

- [x] 1.1 `lib/tasks/subtree.ts`: `fetchTaskSubtree` descarta ids ya visitados (D-E) + test con un ciclo.
- [x] 1.2 `lib/tasks/move-subtree.ts`: `fetchDescendants` y `cascadeProjectToDescendants` (D-B) + tests.
- [x] 1.3 `useMoveTask`: la cascada usa 1.2 en vez del caché + test con el caché de origen vacío.
- [x] 1.4 `useBulkMoveTasks`: cascada con 1.2, foto previa desde la base dentro de `mutationFn`, deshacer que restaura descendientes y reporta errores (D-C) + tests.

## 2. Etiquetas

- [x] 2.1 `lib/tasks/replace-labels.ts`: `replaceTaskLabels` por diferencia, insertar antes de borrar (D-I) + tests de ambas fallas.
- [x] 2.2 `useReplaceTaskLabels` usa 2.1 + ajustar tests.

## 3. Recurrencia

- [x] 3.1 `lib/recurrence/next.ts`: `nextOccurrence` devuelve `null` con la regla agotada (D-G) + test.
- [x] 3.2 `lib/recurrence/series.ts`: `planNextOccurrence` devuelve `null` con regla agotada u ocurrencia posterior a `recurrence_ends_at`; el último día queda incluido (D-G) + tests.
- [x] 3.3 `lib/recurrence/create-next-occurrence.ts`: no crea si ya hay una pendiente de la misma serie y fecha (D-F); `labelsFailed` en vez de lanzar (D-J) + tests.
- [x] 3.4 `useUpdateTask`: aviso cuando `labelsFailed` + test.

## 4. Deshacer un borrado

- [x] 4.1 `lib/tasks/restore.ts`: recordatorios en la foto y en la restauración; las tres inserciones dependientes se intentan todas y se lanza el primer error (D-H) + tests.

## 5. Servidor MCP

- [x] 5.1 `lib/mcp/tools/task-placement.ts`: validación de proyecto, sección, padre y ciclo (D-D) + tests.
- [x] 5.2 `editar`: valida la ubicación resultante, arrastra descendientes al cambiar de proyecto y usa `replaceTaskLabels` + tests.
- [x] 5.3 `crear_tarea`: hereda el proyecto del padre, valida la ubicación y devuelve `aviso` si fallan las etiquetas (D-J) + tests.
- [x] 5.4 `completar_tarea`: actualización condicional e idempotente, informa `labelsFailed` (D-F) + tests.
- [x] 5.5 Actualizar las descripciones de las herramientas donde cambia el contrato (`parent_id` en `crear_tarea`, `editar`).

## 6. Cierre

- [x] 6.1 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [x] 6.2 Anotar en `docs/decisions.md` el seguimiento pendiente: validación del árbol en la base.
