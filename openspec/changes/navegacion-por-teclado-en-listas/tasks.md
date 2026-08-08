## 1. Reducer del cursor

- [x] 1.1 Crear `lib/cursor/reducer.ts` con estado `{ cursorId: string | null }` y acciones `move` (`up`/`down`/`first`/`last`), `set`, `clear` y `reconcile`, todas recibiendo `orderedIds`. Estado puro, sin DOM, mismo estilo que `lib/selection/reducer.ts`.
- [x] 1.2 Implementar la regla de reconciliación de D-C: id presente → no se mueve; id ausente → misma posición; lista más corta → última; lista vacía → sin cursor.
- [x] 1.3 Sin vuelta en los extremos: `up` en la primera y `down` en la última no hacen nada.
- [x] 1.4 Tests del reducer, con foco en la reconciliación: completar la fila señalada, reordenar por realtime, borrar la última, vaciar la lista.

## 2. Lista aplanada

- [x] 2.1 Función compartida que, dados los grupos ya resueltos por la pantalla, devuelva los ids de fila en orden visual, salteando secciones colapsadas y subtareas plegadas, y sin incluir encabezados.
- [x] 2.2 Estrenarla en la vista de Proyecto (la más simple) antes de generalizar. Si la firma no alcanza al llegar a la tercera pantalla, corregirla ahí — no antes. **Queda para la delegación de los bloques 3-8**: la de los bloques 1-2 no podía tocar `components/` por trabajo en paralelo sobre `task-row.tsx`. Corregida en Proyecto directamente, como habilitaba la nota: la firma de `flattenVisibleRows` no cambió, pero el subárbol de subtareas colapsadas era estado local de `TaskRow` (`useState`), invisible para la pantalla — se levantó a `collapsedTaskIds`/`onSetCollapsed`, opcional y con fallback a estado local en cualquier otro lugar que no lo pase (detalle de tarea, tablero).
- [x] 2.3 Tests del aplanado con sección colapsada, subtareas anidadas de más de un nivel, y agrupación por prioridad.

## 3. Foco y semántica

- [x] 3.1 Roving tabindex en el contenedor de lista y en `components/tasks/task-row.tsx`: `role="listbox"` / `role="option"`, `tabIndex` 0 en la fila señalada y -1 en el resto, `.focus()` real al moverse (D-A). Los controles internos de la fila (grip, casillero de completar, casillero de selección, título, botón "…") pasan a `tabIndex={-1}` cuando hay cursor cableado — si no, `Tab` los seguiría recorriendo uno por uno y nunca "saldría de una" (3.2). Reordenar por teclado sigue disponible por el menú ("Mover arriba"/"Mover abajo"), nunca solo por arrastre.
- [x] 3.2 Confirmar que `Tab` entra y sale de la lista de una, sin recorrer fila por fila. Verificado por test (`task-row-cursor.test.tsx`: solo la fila señalada, o la primera sin cursor todavía, tiene `tabIndex=0`; el resto `-1`). No pude confirmarlo en un navegador real dentro de este entorno (ver 8.4).
- [x] 3.3 Confirmar que la fila señalada queda visible al moverse fuera del área visible. `scrollIntoView({ block: "nearest" })` explícito en `ListCursorProvider`, además del scroll nativo que ya trae `.focus()`. No hay forma de verificar el scroll real en jsdom (memoria: "el redimensionado no funciona, usar Playwright" aplica también acá) — sin verificación en navegador.
- [ ] 3.4 Probar con un lector de pantalla real, no solo con los roles puestos. **No pude hacerlo**: este entorno es una CLI sin navegador ni lector de pantalla real. Los roles quedaron puestos (`listbox`/`option`, `aria-selected`, `aria-multiselectable`) siguiendo el patrón WAI-ARIA de listbox, pero el riesgo que anota design.md (que resulte hostil por los controles que cada fila tiene adentro, y haga falta `grid`) sigue sin probarse de verdad.

## 4. Teclas

- [x] 4.1 Registrar el contexto de atajos de lista con `useShortcutScope`: `↑`, `↓`, `Inicio`, `Fin`, `Enter`, `Espacio`, `X`, `.`, `⇧F10`, `⇧↑`, `⇧↓`. `↑`/`↓`/`Inicio`/`Fin`/`⇧↑`/`⇧↓` viven una sola vez por pantalla en `ListCursorProvider` (no dependen de ninguna fila); `Enter`/`Espacio`/`X`/`.`/`⇧F10`/tecla Menú viven en `TaskRow`, activos solo mientras esa fila es la señalada.
- [x] 4.2 `preventDefault()` en `Espacio`: gratis, vía el mismo mecanismo que ya usa `resolveFromScopes` en `shortcut-provider.tsx` (llama `event.preventDefault()` antes de cualquier handler que matchee). Test explícito en `task-row-cursor.test.tsx` que confirma `defaultPrevented`.
- [x] 4.3 Guarda de foco: cubierta por la guardia existente (`isBlockedByFocusGuard`, sin tocar) más el propio comportamiento nativo del navegador para `↑`/`↓` dentro de un campo (no se interceptan). Test explícito para `Espacio` en el alta rápida.
- [x] 4.4 Con el detalle de tarea abierto: `ListCursorProvider` lee `useTaskDetail().openTaskId` y suspende sus propias teclas; `TaskRow` hace lo mismo para las suyas. Con un menú de fila abierto: `setRowMenuOpen`/`setMenuOpen` en `ListCursorProvider` suspende `↑`/`↓`/`Inicio`/`Fin`/`⇧↑`/`⇧↓` mientras cualquier fila tiene su menú abierto (no solo la señalada, por si se abrió con clic derecho en otra). Tests para los dos casos.
- [x] 4.5 `.` clickea el botón "…" de la fila (mismo patrón que `clickFirstButton` ya usa para los selectores del detalle), que abre el mismo `menuEntries` que el clic derecho. Al cerrarse (`handleMenuOpenChange(false)`), el foco vuelve al nodo de la fila si sigue montado; si el menú borró la fila (ej. "Eliminar"), `reconcile` en `ListCursorProvider` ya se encarga (D-C) — no hace falta código especial para ese caso, pero tampoco hay test dedicado a esa combinación exacta (menú + eliminar + foco): quedó cubierta la reconciliación en general (bloque 1) y el cierre normal del menú (test acá), no la intersección de las dos cosas a la vez.

## 5. Selección

- [x] 5.1 `X` despacha el `toggle` que ya existe en `lib/selection/reducer.ts`, sin agregar estado nuevo. Solo donde el casillero también existiría (`selectableHere`, depth 0 con selección múltiple activa): una subtarea señalada no tiene casillero, y `X` ahí no hace nada — mismo criterio que ya regía la selección, no uno nuevo de este bloque.
- [x] 5.2 `⇧↑`/`⇧↓` mueven el cursor y despachan `range` con el `anchorId` que ya existe, los dos en el mismo handler de `ListCursorProvider` (calcula el próximo id con el reducer puro, sin esperar el `dispatch`, para poder pasárselo a `rangeSelect` en el mismo evento). Sin ancla propia del teclado.
- [x] 5.3 Test: clic en un casillero + `⇧↓` calculan el rango desde el mismo ancla que un `⇧clic`.
- [x] 5.4 Test: `Escape` vacía la selección y deja el cursor donde estaba (no se toca nada del estado del cursor al limpiar selección).

## 6. Tratamiento visual

- [x] 6.1 Definido antes de escribir el CSS: la selección es un fondo (`bg-primary/10`, mismo lenguaje que el casillero relleno), el cursor es un anillo fijo (`ring-2 ring-inset ring-primary/50`, mismo `ring` que ya usa el foco estándar de la app pero no condicionado a `focus-visible` — la fila ya tiene el foco real). Dos canales visuales distintos (relleno vs. contorno) a propósito, para que se puedan combinar sin ambigüedad.
- [x] 6.2 Señalada y seleccionada a la vez: se aplican las dos clases juntas (fondo + anillo) — verificado leyendo las clases resultantes en el DOM de prueba (`task-row-cursor.test.tsx`), no visualmente en navegador (ver 8.4).

## 7. Despliegue por pantalla

- [x] 7.1 Proyecto. `SectionedTasks` (la lista agrupada por sección) arma `cursorOrderIds` con `flattenVisibleRows` sobre el árbol completo de tareas + subtareas, respetando `is_collapsed` de cada sección y `collapsedTaskIds` (levantado, ver 2.2). Las otras dos ramas de esta misma pantalla (agrupada por fecha/prioridad/etiqueta, sin subtareas) usan directamente el orden ya calculado para la selección.
- [x] 7.2 Bandeja de entrada. Mismo componente que Proyecto (`SectionedTasks`, `viewKey === "bandeja"`); no hizo falta nada aparte.
- [x] 7.3 Etiqueta y Filtro. Sin subtareas ni secciones (`variant="flat"`): el cursor reusa el mismo `orderedIds` ya calculado para la selección.
- [x] 7.4 Próximos (lista agrupada por día). Combina el orden de "atrasadas" + cada día, cada uno pasado por `groupTasks` con el agrupador de la pantalla (mismo cálculo que ya hace `TaskGroupList` puertas adentro, para que el orden del cursor coincida con lo que se ve).
- [x] 7.5 Hoy. **Decisión tomada, documentada en el código y acá**: el cursor recorre únicamente filas de tarea — nunca un evento ni un hábito. No es una decisión nueva de este bloque: reusa el mismo criterio que ya excluye a los eventos de la selección múltiple (`todaySequenceTaskIds`, spec `vistas-lista`, "un evento no se puede seleccionar"); los hábitos ni siquiera pasan por `TaskRow`/`ListCursorProvider` (viven en `HabitsTodayBlock`, un árbol de componentes aparte). Con el cursor nunca pudiendo señalar un evento o un hábito, la pregunta de qué hacen `Espacio`/`.` sobre ellos queda resuelta por construcción: esas teclas jamás llegan ahí. No creció más allá de esto, así que no se abrió una propuesta aparte — si el dueño quisiera que el cursor sí recorriera eventos/hábitos algún día, esa sí sería una decisión nueva.

## 8. Cierre

- [x] 8.1 Confirmado por construcción y por lectura: `ListCursorProvider` solo envuelve las ramas de forma "lista" de las seis pantallas — nunca las de `viewShape === "panel"` ni `"calendario"` (verificado grepeando los seis archivos).
- [x] 8.2 `docs/product-spec.md`, sección 10: agregado el párrafo "Cursor de lista" con las teclas nuevas.
- [x] 8.3 `pnpm lint && pnpm typecheck && pnpm test` en verde (199 archivos, 1651 tests — 1631 preexistentes + 20 nuevos de este cambio, cero regresiones).
- [ ] 8.4 **No pude verificarlo en el navegador**: este entorno es una CLI sin GUI, y además `.env.local` apunta al Supabase de producción (no se puede iniciar sesión en la app real desde acá, por instrucción explícita). Lo más cerca que llegué es el test de integración de `TaskRow` + `ListCursorProvider` con datos sintéticos (`components/tasks/task-row-cursor.test.tsx`), que cubre cada pieza de memoria en tests separados: recorrer con flechas, completar con `Espacio` sin perder el cursor (incluida la reconciliación cuando la fila sale de la lista), seleccionar con `⇧↓` y ver la selección reflejada, y abrir el menú con `.`. Ninguno de esos tests reemplaza abrir la app de verdad — queda pendiente para quien pueda hacerlo con datos sintéticos montados, no contra producción.
