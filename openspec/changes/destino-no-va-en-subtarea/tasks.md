> **El código ya está hecho y commiteado** (`ec74254`). Esta propuesta existe porque el
> spec quedó contradiciéndolo, y el spec no se edita a mano.

## 1. Verificar que el código hace lo que el spec nuevo dice

- [x] 1.1 `components/tasks/task-quick-add-row.tsx` no muestra el destino cuando hay tarea padre
- [x] 1.2 Confirmar que la condición es **por tener padre y no por variante** (**D-A**). Si estuviera atada a la variante embebida, rompería el destino en listas y secciones, que es justo lo que la propuesta anterior arregló
- [x] 1.3 Confirmar en el navegador que el alta dentro de una **sección**, sin padre, sigue mostrando el destino
- [x] 1.4 Confirmar que la subtarea creada queda en el proyecto y la sección del padre
- [x] 1.5 Que haya un test que cubra las dos caras: con padre no se muestra, sin padre sí

## 2. Verificación

- [x] 2.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [x] 2.2 Crear una subtarea desde el menú de una fila y desde el detalle de una tarea: en las dos, sin selector de destino
- [x] 2.3 Crear una tarea desde una lista, desde una sección y desde el modal global: en las tres, con destino
