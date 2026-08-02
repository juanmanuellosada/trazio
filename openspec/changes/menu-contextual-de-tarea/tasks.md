> **El grupo 1 es bloqueante**: hasta que las dos entradas no compartan un solo menú, todo
> lo que se agregue después hay que agregarlo dos veces. Los grupos 2 y 3 corren en
> paralelo. El grupo 4 es la verificación.
>
> **Casi todas las piezas existen.** La primitiva de menú por clic derecho, los accesos
> rápidos de fecha, el punto de prioridad, duplicar, mover, copiar enlace y eliminar están
> construidos. Esto es ensamblar, no construir. **Leé antes de escribir.**

## 1. Un solo menú, dos entradas (bloqueante)

- [ ] 1.1 El clic derecho sobre la fila abre el menú. Sería el **segundo consumidor** de la primitiva de menú contextual, que hoy usa solo el editor de descripción y cuya documentación dice que espera uno
- [ ] 1.2 El botón de acciones y el clic derecho abren **el mismo** menú (**D-A**). No dos listas que después divergen
- [ ] 1.3 **El clic derecho tiene que seguir dando el menú del navegador** sobre un enlace, sobre texto seleccionado y dentro de un campo editable (**D-E**). Es el error más probable de la tanda y el más molesto: alguien que quiere copiar y recibe un menú de tarea. **Probarlo, no razonarlo**
- [ ] 1.4 Los ítems que hoy se ocultan según la superficie tienen que seguir ocultándose igual

## 2. Fecha y prioridad en el lugar *(paralelo tras el grupo 1)*

- [ ] 2.1 Fila de accesos rápidos de fecha, reutilizando los cuatro que ya existen
- [ ] 2.2 **Agregar los dos que faltan**: quitar la fecha —hoy es un botón dentro del selector, no un acceso rápido— y abrir el selector completo
- [ ] 2.3 Fila con las cuatro prioridades, reutilizando el punto de color que ya se usa en la fila
- [ ] 2.4 `T` e `Y` abren esas filas en vez de abrir el detalle (**D-C**). **Ojo**: el spec de atajos ya dice que abren "el selector de fecha" y "de prioridad" de esa tarea, así que esto **acerca** el código al contrato; el comportamiento viejo ya se desviaba
- [ ] 2.5 Sumar fecha límite y recordatorios, delegando en sus selectores

## 3. Agregar encima y debajo *(paralelo tras el grupo 1)*

- [ ] 3.1 Las dos acciones, con **el componente de alta compartido** (**D-D**). El spec de `alta-de-tareas` exige que ninguna superficie tenga implementación propia, y ya se violó una vez con el alta del calendario
- [ ] 3.2 La posición se calcula con las primitivas que ya existen en el árbol de tareas
- [ ] 3.3 Hereda proyecto, sección y tarea padre de la de referencia
- [ ] 3.4 Si la de referencia es subtarea, la nueva también, y ahí **el alta no muestra destino** — es la regla que se acaba de escribir en `destino-no-va-en-subtarea`

## 4. Verificación

- [ ] 4.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] 4.2 Si ves muchos tests fallando con `Invalid Chai property`, **no es tu cambio y no reescribas ningún test**: es el árbol de dependencias. `rm -rf node_modules && pnpm install --frozen-lockfile`, y no corras `pnpm install` dentro de un worktree
- [ ] 4.3 Abrir el menú **con las dos entradas** y comprobar que ofrecen lo mismo
- [ ] 4.4 **El clic derecho del navegador sigue funcionando** sobre un enlace, sobre texto seleccionado y en un campo editable
- [ ] 4.5 Cambiar fecha y prioridad desde el menú, sin que se abra el detalle
- [ ] 4.6 Quitar la fecha, y abrir el selector completo desde el menú
- [ ] 4.7 Apretar `T`, `Y`, `V`, `⇧Ctrl+C`, `Ctrl⇧N` y `⇧Supr` con el menú abierto
- [ ] 4.8 Agregar una tarea encima y otra debajo, y **comprobar que quedaron en la posición correcta**, no solo que se crearon
- [ ] 4.9 Lo mismo sobre una subtarea
- [ ] 4.10 Recorrer el menú en **cada superficie** donde hay filas: lista, tablero, agrupada, secciones, etiqueta, filtro, búsqueda, completado. Los ítems que no aplican no tienen que aparecer
- [ ] 4.11 Mirar el menú entero de una vez: con todo lo nuevo son muchos ítems y el orden y los separadores importan más que en uno corto
- [ ] 4.12 En escritorio y en 390px — en el teléfono no hay clic derecho, así que el botón sigue siendo la entrada
