## 1. Parser

- [x] 1.1 Sumar `deadline`, `section`, `project_tree` y `no_label` a `QUERY_FIELDS` en `lib/query-language/ast.ts`.
- [x] 1.2 `deadline` reusa exactamente el análisis de valores de `due`, incluidos `before:` y `after:` (D-A). No escribir un segundo analizador de fechas.
- [x] 1.3 `no_label` reusa el análisis booleano de `no_project`.
- [x] 1.4 Sumar `notime` a los valores aceptados por `due` (D-D).
- [x] 1.5 Completar `field-reference.ts` — el typecheck lo va a exigir (D-E). Descripción y ejemplo por campo, con el criterio de la referencia: se toca, no se lee.
- [x] 1.6 Tests del parser para los cinco casos nuevos, más los errores de valor inválido.

## 2. Evaluación

- [x] 2.1 Migración que reemplaza `buscar_tareas(ast, at)` con las ramas nuevas. Sigue `security invoker`: la RLS acota el resultado y no hay que levantarla.
- [x] 2.2 `project_tree` resuelve descendientes a cualquier profundidad. El anidamiento llega a tres niveles pero no lo asumas en la consulta.
- [x] 2.3 `due:notime` es fecha presente **y** hora ausente. Verificá explícitamente que una tarea sin ninguna fecha no entra.
- [x] 2.4 `section` compara por nombre y cruza proyectos (D-C).
- [x] 2.5 `pnpm db:types`.
- [x] 2.6 Tests SQL contra el Supabase local para los cinco campos, con foco en `project_tree` con nietos y en el borde de `due:notime`.

## 3. Cierre

- [x] 3.1 Verificar que `project:` sigue devolviendo exactamente lo mismo que antes: hay filtros guardados que dependen de eso.
- [x] 3.2 Actualizar `docs/product-spec.md`, sección 7.
- [x] 3.3 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [x] 3.4 Verificar en el navegador que los campos nuevos aparecen en la referencia del modal y que tocar sus ejemplos devuelve resultados.
