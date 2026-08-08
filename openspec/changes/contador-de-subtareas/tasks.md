## 1. Fila

- [ ] 1.1 Calcular el contador en `components/tasks/task-row.tsx` a partir de `children`, que ya se resuelve para decidir el chevron. Sin consultas nuevas.
- [ ] 1.2 Renderizarlo pegado al chevron, como hermano del botón del título (D-B), con `aria-hidden` en el elemento visual.
- [ ] 1.3 Incorporar el conteo a la etiqueta del chevron: `Mostrar 5 subtareas de {título}, 2 completadas` / `Ocultar …` (D-C).
- [ ] 1.4 Confirmar que en `variant="board"` no aparece: `isFlat` ya fuerza `children = []`, así que tiene que salir solo — verificarlo, no asumirlo.

## 2. Detalle

- [ ] 2.1 Mostrar el mismo contador en el encabezado de la lista de subtareas del detalle, con el mismo criterio de conteo.

## 3. Tests

- [ ] 3.1 Tests de la fila: con y sin subtareas, plegada y desplegada, anidada de dos niveles (el contador cuenta 3, no 7).
- [ ] 3.2 Test de que el contador se actualiza al completar una subtarea.
- [ ] 3.3 Test de que buscar la tarea por su nombre accesible sigue funcionando sin el contador incorporado. Si falla, el contador quedó adentro del botón: moverlo, no ajustar la prueba.
- [ ] 3.4 Test de la etiqueta del chevron con el conteo.

## 4. Cierre

- [ ] 4.1 Verificar en 390px que el contador no le come ancho al título (D41 discute ese límite en detalle).
- [ ] 4.2 Actualizar `docs/product-spec.md` donde describe la fila de tarea.
- [ ] 4.3 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 4.4 Verificar en el navegador con una tarea de varios niveles.
