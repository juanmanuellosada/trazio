## 1. Decisiones y documentación

- [ ] 1.1 Registrar en `docs/decisions.md` la inversión de símbolos (`#` pasa a proyecto y sección, `@` a etiqueta) con el argumento de Todoist que la decide.
- [ ] 1.2 Registrar en `docs/decisions.md` el cambio de nombres de prioridad al formato `P<n> · Nombre` y la decisión de mover P3/Media a un azul más visible (el hex concreto se elige y valida en la tarea 5.6).
- [ ] 1.3 Registrar en `docs/decisions.md` el adelanto de administración de etiquetas desde fase 2, dejando explícito que la página propia por etiqueta y las favoritas siguen en fase 2.
- [ ] 1.4 Registrar en `docs/decisions.md` el criterio de centrado con piso (F1): centrado por encima de un umbral de ancho, alineado a la izquierda por debajo.
- [ ] 1.5 Actualizar `docs/product-spec.md` §6 (línea "Símbolos"): invertir a `#` elige proyecto o sección; `@` elige o crea una etiqueta.
- [ ] 1.6 Actualizar `docs/design-system.md` §3 (colores de prioridad): nombres al formato `P<n> · Nombre` (el hex de P3/Media se actualiza en la tarea 5.6, una vez elegido).
- [ ] 1.7 Reescribir `docs/design-system.md` §5.1 (ancho de columna de contenido): el documento hoy argumenta explícitamente a favor de alinear siempre a la izquierda y en contra de centrar con `mx-auto`; reemplazar ese argumento por el criterio de centrado con piso (F1) — centrado por encima de un umbral, alineado a la izquierda por debajo. El valor numérico concreto del umbral se documenta en la tarea 9.2.

## 2. La inversión de símbolos completa

- [ ] 2.1 Actualizar `docs/parser-test-cases.md`: reescribir los casos 40 a 43 y 53 con `#` y `@` invertidos.
- [ ] 2.2 Actualizar el reconocedor de símbolos del parser para que `#` resuelva proyecto y sección (coincidencia más larga, hasta 3 niveles con `/`) y `@` resuelva etiqueta (hasta el primer espacio o símbolo).
- [ ] 2.3 Actualizar `lib/parser/casos.ts` (el contrato ejecutable) para reflejar los casos 40 a 43 y 53 ya invertidos.
- [ ] 2.4 Actualizar la demo de la landing (`lib/landing/static-parses.ts` y cualquier otro lugar de marketing que use `#` o `@` como ejemplo, incluido el caso 53 adaptado) para el nuevo significado de los símbolos.
- [ ] 2.5 Confirmar la secuencia: mientras las tareas 2.1 a 2.4 no estén las cuatro completas, `lib/parser/parser.test.ts` (el test que compara contrato y código) SHALL estar en rojo — es la señal esperada de que la migración quedó a medias, no una regresión a investigar. El criterio de cierre de este bloque es que ese test vuelva a estar en verde con las cuatro tareas terminadas.

## 3. Los menús del parser

- [ ] 3.1 Consultar `ui-ux-pro-max` para el estilo del menú desplegable de `#` y `@` (proyectos con secciones anidadas, etiquetas).
- [ ] 3.2 Implementar el menú que abre `#`, con los proyectos del usuario y sus secciones anidadas debajo de cada uno.
- [ ] 3.3 Implementar el menú que abre `@`, con las etiquetas existentes y una opción para crear una etiqueta nueva cuando lo escrito no coincide con ninguna.
- [ ] 3.4 Implementar el filtrado en vivo del menú a medida que se sigue escribiendo después de `#` o `@`, sin distinguir mayúsculas ni acentos (mismo criterio que E7).
- [ ] 3.5 Implementar navegación por teclado (flechas para mover la selección, Enter o Tab para confirmar) y cierre sin elegir (Escape, escribir fuera del token, clic afuera), sin alterar el texto ya escrito.
- [ ] 3.6 Asegurar que escribir un token de corrido sin tocar el menú produce el mismo resultado que elegirlo del menú, y que el menú nunca roba el foco del campo de texto ni intercepta la escritura normal.
- [ ] 3.7 Verificar que el doble clic (R7) sigue desactivando un token completado desde el menú, igual que uno reconocido escribiendo de corrido.

## 4. Las etiquetas

- [ ] 4.1 Consultar `ui-ux-pro-max` para la pantalla de administración de etiquetas y el selector con búsqueda.
- [ ] 4.2 Construir la pantalla de administración de etiquetas: crear, renombrar y eliminar, con confirmación antes de eliminar.
- [ ] 4.3 Reusar el selector de color de proyectos (`components/projects/color-swatch-picker.tsx`) para el color de etiqueta, con la misma paleta de diez colores y la misma validación de contraste para color personalizado.
- [ ] 4.4 Construir el selector de etiquetas con búsqueda y selección múltiple en el detalle de la tarea, que guarda reemplazando el conjunto completo de etiquetas (no de forma incremental), según el comportamiento ya establecido para la edición de etiquetas de una tarea.
- [ ] 4.5 Verificar que renombrar o recolorear una etiqueta se refleja en todos sus chips existentes, y que eliminarla la quita de todas las tareas apoyándose en la cascada ya garantizada a nivel de base de datos.
- [ ] 4.6 Medir en un navegador real (no en los tests) cuánto tarda en renderizar el selector de íconos de proyecto (`components/projects/emoji-picker.tsx`), que muestra sus ~1900 entradas sin virtualizar — señalado como riesgo desde que se construyó y nunca resuelto. Primero medir, especialmente en un equipo lento; recién después decidir si hace falta virtualizar. Si la medición lo justifica, registrar en `docs/decisions.md` la decisión de sumar una librería de virtualización — está fuera de la lista cerrada de `AGENTS.md` — antes de instalarla.

## 5. Los selectores

- [ ] 5.1 Consultar `ui-ux-pro-max` para el tratamiento visual de la hora escribible, la duración con unidades, los accesos rápidos reacomodados y el nuevo azul de prioridad.
- [ ] 5.2 Hacer el campo de hora de `components/selectors/date-select.tsx` (o el componente que corresponda) escribible además de elegible de la lista.
- [ ] 5.3 Hacer el campo de duración escribible, con selección de unidad (minutos u horas), convirtiendo siempre a minutos antes de guardar en `duration_minutes`.
- [ ] 5.4 Reacomodar los accesos rápidos de fecha en dos filas de dos, cada fila ocupando todo el ancho disponible del selector.
- [ ] 5.5 Renombrar las opciones de `components/selectors/priority-select.tsx` a `P1 · Urgente`, `P2 · Alta`, `P3 · Media`, `P4 · Baja`.
- [ ] 5.6 Elegir el hex del azul de la prioridad 3 (Media) con la validación de contraste de `lib/validation/colors.ts`, verificarlo en modo claro y en modo oscuro, confirmar que no se confunde con el azul de marca (`#283B56`), y documentarlo en `docs/design-system.md` §3 (completa lo dejado abierto en la tarea 1.6).

## 6. El selector de proyecto en el detalle

- [ ] 6.1 Consultar `ui-ux-pro-max` para el selector de proyecto con secciones anidadas y búsqueda.
- [ ] 6.2 Implementar el selector de proyecto en el detalle de la tarea, precargado con el proyecto de origen (o vacío si es de Bandeja de entrada) y editable en cualquier momento.
- [ ] 6.3 Desplegar todos los proyectos del usuario con sus secciones anidadas, con un campo de búsqueda cuando la cantidad es grande.
- [ ] 6.4 Verificar que mover una tarea desde este selector sigue sujeto al trigger de base de datos que valida que el proyecto y la sección pertenezcan al mismo usuario que la tarea.

## 7. Las dos superficies de alta

- [ ] 7.1 Consultar `ui-ux-pro-max` para el modal incrustado y compacto.
- [ ] 7.2 Ajustar el acceso de alta del panel lateral para que abra el mismo modal que el detalle de una tarea, vacío, con título, descripción, fecha, prioridad, fecha límite y proyecto destino.
- [ ] 7.3 Construir el tratamiento incrustado y compacto para el alta dentro de una lista, una sección o una subtarea: título, descripción, y accesos de fecha, prioridad y fecha límite, sin selector de proyecto ni de sección.
- [ ] 7.4 Verificar que las dos superficies se construyen sobre el mismo componente de alta subyacente, y que lo único que cambia entre ellas es qué campos se muestran.

## 8. El editor

- [ ] 8.1 Consultar `ui-ux-pro-max` si hace falta ajustar la retroalimentación visual de la autodetección en línea.
- [ ] 8.2 Implementar la autodetección en línea de negrita, cursiva, tachado, código y resaltado dentro de un párrafo ya empezado, sin dejar las marcas de sintaxis como texto literal.
- [ ] 8.3 Verificar que lo guardado sigue siendo el documento estructurado de Tiptap en la columna `description` (jsonb), nunca texto plano con marcas de markdown.

## 9. El centrado

- [ ] 9.1 Consultar `ui-ux-pro-max` para definir el tope máximo de ancho, el umbral de centrado y el comportamiento intermedio.
- [ ] 9.2 Implementar el centrado de la columna de contenido por encima del umbral y la alineación a la izquierda por debajo, y documentar el valor numérico concreto en `docs/design-system.md` §5.1 (completa lo dejado abierto en la tarea 1.7).
- [ ] 9.3 Verificar que la metadata de una tarea (fecha, prioridad, etc.) acompaña al título en vez de pegarse al borde derecho del contenedor.

## 10. Verificación final

- [ ] 10.1 Ejecutar `pnpm lint && pnpm typecheck && pnpm test` y confirmar que todo pasa, incluido `lib/parser/parser.test.ts` en verde.
- [ ] 10.2 Confirmar que los cuatro lugares de la inversión de símbolos (`docs/parser-test-cases.md`, `lib/parser/casos.ts`, el reconocedor, y la demo de la landing) quedaron invertidos y coherentes entre sí.
- [ ] 10.3 Recorrer la app como usuario: dar de alta una tarea con `#` y `@` desde el panel lateral y desde dentro de una lista, administrar etiquetas (crear, renombrar, recolorear, eliminar), mover una tarea de proyecto desde el detalle, escribir una hora y una duración a mano, revisar la prioridad 3 en modo claro y oscuro, y confirmar el centrado en una pantalla mediana y en una angosta.
- [ ] 10.4 Correr `openspec validate interfaz-refinada --strict` y confirmar que no hay errores.
