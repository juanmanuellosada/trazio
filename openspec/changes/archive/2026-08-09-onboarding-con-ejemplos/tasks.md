## 1. Esquema

- [x] 1.1 Migración que agrega `user_preferences.seeded_at timestamptz` **y** hace el backfill de todas las filas existentes en el mismo archivo (D-C). Dejar escrito en el comentario por qué el backfill no puede ir aparte.
- [x] 1.2 `pnpm db:types`.
- [x] 1.3 Confirmar que `handle_new_user()` no se toca.
- [x] 1.4 Migración que agrega `projects.is_example`, `habits.is_example` y (ampliación) `filters.is_example`, con índice único parcial por usuario en cada una: es lo que le permite a "Borrar los ejemplos" encontrar el proyecto, el hábito y el filtro sembrados sin depender de su nombre.

## 2. Contenido

- [x] 2.1 Escribir el contenido de ejemplo en TypeScript: un proyecto, cuatro tareas (con fecha/hora/prioridad, con subtareas, con etiqueta, y pelada) y un hábito sin hora. Seguir `.claude/rules/copy.md`; nada de texto que le hable a la persona explicándole qué tocar (D-E).
- [x] 2.2 Test que corre la frase del ejemplo del parser por el parser real y verifica que produce los atributos que el ejemplo promete. Es lo que evita que el ejemplo envejezca mintiendo.
- [x] 2.3 (Ampliación) Sumar un filtro guardado de ejemplo al contenido en TypeScript: nombre, ícono, color, favorito desde que se crea, y una consulta útil de verdad (no una demostración de sintaxis) con el lenguaje de `lib/query-language/`. Mismo criterio D-E que el resto: enseña por ser un filtro de verdad.
- [x] 2.4 (Ampliación) Test que corre la consulta del filtro de ejemplo por `parseQuery` real y verifica que es válida, mismo motivo que 2.2.

## 3. Sembrado

- [x] 3.1 Reclamar la marca con `update … set seeded_at = now() where user_id = $1 and seeded_at is null returning user_id` y sembrar solo si devolvió una fila (D-B).
- [x] 3.2 Cablearlo en el camino de entrada del servidor, de modo que termine **antes** de pintar la primera pantalla (D-F): `app/entrar/route.ts` y el equivalente del login.
- [x] 3.3 Test de concurrencia: dos llamadas simultáneas siembran una sola vez.
- [x] 3.4 Test de que una cuenta con `seeded_at` no nulo no siembra nada.
- [x] 3.5 (Ampliación) Sembrar el filtro de ejemplo en el mismo sembrado, marcado favorito.

## 4. Borrado

- [x] 4.1 Acción "Borrar los ejemplos" en el proyecto de ejemplo, que se lleva el proyecto con sus tareas, el hábito y el filtro de ejemplo (ampliación), con confirmación explícita reusando el camino del borrado de proyecto.
- [x] 4.2 Verificar que no queda el hábito suelto en la pantalla de Hábitos ni el filtro suelto en el panel lateral (ampliación): es el modo de falla que hace que la acción no sirva. **Cerrada por decisión del dueño**: sin verificación en el navegador.
- [x] 4.3 Test de la acción completa, incluido el caso del filtro (ampliación).

## 5. Cierre

- [x] 5.1 Sumar el contenido de ejemplo a `docs/product-spec.md`, en el flujo de registro (incluido el filtro de la ampliación). También se actualizó `docs/data-model.md` con las columnas nuevas (`seeded_at`, `is_example` x3), por consistencia con el resto del repo.
- [x] 5.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [x] 5.3 Registrarse con una cuenta nueva de verdad en el navegador y confirmar que el contenido está en la primera pantalla. **Cerrada por decisión del dueño**: sin verificación en el navegador.
- [x] 5.4 Entrar con una cuenta vieja y confirmar que NO aparece nada. Verificarlo contra producción antes de desplegar, no después. **Cerrada por decisión del dueño**: sin verificación en el navegador.
