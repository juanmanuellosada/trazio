## 1. Esquema

- [ ] 1.1 Migración que agrega `user_preferences.seeded_at timestamptz` **y** hace el backfill de todas las filas existentes en el mismo archivo (D-C). Dejar escrito en el comentario por qué el backfill no puede ir aparte.
- [ ] 1.2 `pnpm db:types`.
- [ ] 1.3 Confirmar que `handle_new_user()` no se toca.

## 2. Contenido

- [ ] 2.1 Escribir el contenido de ejemplo en TypeScript: un proyecto, cuatro tareas (con fecha/hora/prioridad, con subtareas, con etiqueta, y pelada) y un hábito sin hora. Seguir `.claude/rules/copy.md`; nada de texto que le hable a la persona explicándole qué tocar (D-E).
- [ ] 2.2 Test que corre la frase del ejemplo del parser por el parser real y verifica que produce los atributos que el ejemplo promete. Es lo que evita que el ejemplo envejezca mintiendo.

## 3. Sembrado

- [ ] 3.1 Reclamar la marca con `update … set seeded_at = now() where user_id = $1 and seeded_at is null returning user_id` y sembrar solo si devolvió una fila (D-B).
- [ ] 3.2 Cablearlo en el camino de entrada del servidor, de modo que termine **antes** de pintar la primera pantalla (D-F): `app/entrar/route.ts` y el equivalente del login.
- [ ] 3.3 Test de concurrencia: dos llamadas simultáneas siembran una sola vez.
- [ ] 3.4 Test de que una cuenta con `seeded_at` no nulo no siembra nada.

## 4. Borrado

- [ ] 4.1 Acción "Borrar los ejemplos" en el proyecto de ejemplo, que se lleva el proyecto con sus tareas y el hábito, con confirmación explícita reusando el camino del borrado de proyecto.
- [ ] 4.2 Verificar que no queda el hábito suelto en la pantalla de Hábitos: es el modo de falla que hace que la acción no sirva.
- [ ] 4.3 Test de la acción completa.

## 5. Cierre

- [ ] 5.1 Sumar el contenido de ejemplo a `docs/product-spec.md`, en el flujo de registro.
- [ ] 5.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 5.3 Registrarse con una cuenta nueva de verdad en el navegador y confirmar que el contenido está en la primera pantalla.
- [ ] 5.4 Entrar con una cuenta vieja y confirmar que NO aparece nada. Verificarlo contra producción antes de desplegar, no después.
