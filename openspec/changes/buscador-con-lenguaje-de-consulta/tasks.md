## 1. Detección y resolución

- [ ] 1.1 En `lib/search/use-search.ts`, intentar parsear lo escrito con `lib/query-language/parse.ts`. Si parsea, resolver con el RPC `buscar_tareas` tal como lo llama `lib/filters/use-filter-results.ts`. Si no, la rama de texto de hoy, sin cambios.
- [ ] 1.2 Aplicar el tope de 50 también en la rama de consulta, para que el requisito existente siga siendo cierto en los dos modos.
- [ ] 1.3 Tests de la detección: consulta válida, texto común, y el caso borde de una palabra que se parece a un campo (`label`, `due`) escrita suelta — tiene que caer en texto.

## 2. Errores

- [ ] 2.1 Mostrar el error de sintaxis en español con su posición, reusando `lib/query-language/errors.ts`. NO caer a texto en silencio (D-B).
- [ ] 2.2 Test de que un paréntesis sin cerrar muestra el error en vez de una lista vacía.

## 3. Guardar como filtro

- [ ] 3.1 Acción para guardar la consulta escrita, precargando el alta de filtro con la mutación que ya existe.
- [ ] 3.2 Test de que la consulta llega precargada.

## 4. Cierre

- [ ] 4.1 Actualizar `docs/product-spec.md` en la sección del buscador.
- [ ] 4.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 4.3 Verificar en el navegador con las dos formas de escribir.
