## 1. Reducer del cursor

- [ ] 1.1 Crear `lib/cursor/reducer.ts` con estado `{ cursorId: string | null }` y acciones `move` (`up`/`down`/`first`/`last`), `set`, `clear` y `reconcile`, todas recibiendo `orderedIds`. Estado puro, sin DOM, mismo estilo que `lib/selection/reducer.ts`.
- [ ] 1.2 Implementar la regla de reconciliación de D-C: id presente → no se mueve; id ausente → misma posición; lista más corta → última; lista vacía → sin cursor.
- [ ] 1.3 Sin vuelta en los extremos: `up` en la primera y `down` en la última no hacen nada.
- [ ] 1.4 Tests del reducer, con foco en la reconciliación: completar la fila señalada, reordenar por realtime, borrar la última, vaciar la lista.

## 2. Lista aplanada

- [ ] 2.1 Función compartida que, dados los grupos ya resueltos por la pantalla, devuelva los ids de fila en orden visual, salteando secciones colapsadas y subtareas plegadas, y sin incluir encabezados.
- [ ] 2.2 Estrenarla en la vista de Proyecto (la más simple) antes de generalizar. Si la firma no alcanza al llegar a la tercera pantalla, corregirla ahí — no antes.
- [ ] 2.3 Tests del aplanado con sección colapsada, subtareas anidadas de más de un nivel, y agrupación por prioridad.

## 3. Foco y semántica

- [ ] 3.1 Roving tabindex en el contenedor de lista y en `components/tasks/task-row.tsx`: `role="listbox"` / `role="option"`, `tabIndex` 0 en la fila señalada y -1 en el resto, `.focus()` real al moverse (D-A).
- [ ] 3.2 Confirmar que `Tab` entra y sale de la lista de una, sin recorrer fila por fila.
- [ ] 3.3 Confirmar que la fila señalada queda visible al moverse fuera del área visible.
- [ ] 3.4 Probar con un lector de pantalla real, no solo con los roles puestos. Si `listbox` resulta hostil por los controles que cada fila tiene adentro, evaluar `grid` (riesgo anotado en design.md).

## 4. Teclas

- [ ] 4.1 Registrar el contexto de atajos de lista con `useShortcutScope`: `↑`, `↓`, `Inicio`, `Fin`, `Enter`, `Espacio`, `X`, `.`, `⇧F10`, `⇧↑`, `⇧↓`.
- [ ] 4.2 `preventDefault()` en `Espacio` para que completar no desplace la página (D-F). Test explícito: es el bug clásico de esta función.
- [ ] 4.3 Verificar que la guarda de foco existente bloquea `Espacio` y `X` con el foco en el alta rápida en línea, y que `↑`/`↓` ahí mueven el cursor de texto y no el de la lista.
- [ ] 4.4 Verificar que con el detalle de tarea o un menú abierto las teclas del cursor no se disparan: la pila de contextos ya lo resuelve, pero hace falta el test.
- [ ] 4.5 `.` abre el menú de acciones sobre la fila señalada, y al cerrarlo el foco vuelve a esa fila. Probar el caso de un menú que elimina la fila: el foco vuelve a un nodo que ya no existe y manda la regla de D-C.

## 5. Selección

- [ ] 5.1 `X` despacha el `toggle` que ya existe en `lib/selection/reducer.ts`, sin agregar estado nuevo.
- [ ] 5.2 `⇧↑`/`⇧↓` mueven el cursor y despachan `range` con el `anchorId` que ya existe. NO crear un ancla propia del teclado (D-E).
- [ ] 5.3 Verificar que un clic en un casillero y un `⇧↓` posterior calculan el rango desde el mismo ancla.
- [ ] 5.4 Verificar que `Escape` vacía la selección y deja el cursor donde estaba.

## 6. Tratamiento visual

- [ ] 6.1 Definir con la skill `ui-ux-pro-max` cómo se ve la fila señalada frente a la seleccionada, antes de escribir el CSS.
- [ ] 6.2 Resolver explícitamente la fila señalada **y** seleccionada a la vez: es donde se nota si los dos tratamientos están mal elegidos.

## 7. Despliegue por pantalla

- [ ] 7.1 Proyecto.
- [ ] 7.2 Bandeja de entrada.
- [ ] 7.3 Etiqueta y Filtro.
- [ ] 7.4 Próximos (lista agrupada por día).
- [ ] 7.5 Hoy, al final: su lista intercala eventos y hábitos con las tareas, y hay que decidir si el cursor se para sobre un evento o un hábito, y qué hacen `Espacio` y `.` ahí. Si esa decisión crece, sacarla a una propuesta propia en vez de resolverla al pasar.

## 8. Cierre

- [ ] 8.1 Confirmar que el cursor no aparece en panel ni en calendario.
- [ ] 8.2 Actualizar `docs/product-spec.md`, sección 10 (atajos de teclado).
- [ ] 8.3 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 8.4 Verificar en el navegador: recorrer una lista larga, completar tres seguidas con `Espacio` sin perder el cursor, seleccionar un rango con `⇧↓` y actuar en lote, y abrir el menú con `.` y usar un atajo de adentro.
