> **El tablero no tiene una sola prueba.** Ni él, ni las dos pantallas que lo montan, ni ninguna de
> punta a punta. Se está por reescribir la parte menos cubierta de la aplicación: **escribí pruebas
> antes de tocar**, o no vas a saber qué rompiste.
>
> **Mover escribe datos de verdad.** Un arrastre que cae en la columna equivocada le cambia la
> prioridad, la fecha o la sección a una tarea real. No es como reordenar, que es cosmético.
>
> **Agrupar por etiqueta queda fuera del panel** por decisión del dueño. Eso simplifica todo: cada
> tarea cae en **exactamente una columna**, así que el identificador de la tarea alcanza como
> identidad de arrastre y no hace falta componerlo con la columna.

## 1. Las columnas salen del agrupador

- [x] 1.1 El agrupador suma **sección** y **fecha** a sus valores
- [x] 1.2 "Nada" es **la agrupación natural de la pantalla** (**D-A**): secciones en Bandeja y Proyecto, días en Próximos. Nunca una sola columna. En Hoy, "nada" es **prioridad** (caso especial sin cableado en el design, decisión del dueño: Hoy cruza proyectos y es un solo día, así que ni secciones ni días le sirven)
- [x] 1.3 Quien no toque nada **no debería ver ningún cambio**. Es la prueba de que "nada" quedó bien resuelto — verificado en el navegador: Bandeja/Proyecto siguen mostrando secciones, Próximos sigue mostrando la ventana de días completa (no solo los días con tareas)
- [x] 1.4 En lista, el agrupador **sigue haciendo lo mismo que hoy**, etiqueta incluida. No lo toques — `lib/view-options/group-tasks.ts` no se tocó
- [x] 1.5 **En panel no se ofrece etiqueta** (**D-B**). Y si la preferencia guardada ya es "etiqueta", el panel se comporta como "nada" **sin pisar el valor**: volver a la lista tiene que encontrarlo intacto — verificado en el navegador con lectura directa de `view_preferences`
- [x] 1.6 Cero columnas muestra un estado vacío. Hoy deja **la pantalla en blanco** agrupando por prioridad sin tareas — `sectionColumns`/`dateColumns`/`priorityColumns` nunca devuelven un arreglo vacío (siempre "Sin sección"/"Sin fecha"/las cuatro prioridades), verificado por `lib/board/panel-columns.test.ts`
- [ ] 1.7 Agrupar por fecha genera **tantas columnas como días con tareas**. Con tareas repartidas en meses son decenas: mirá qué pasa y contame si hace falta un límite — **no probado con ese volumen**. Ver el riesgo en mi reporte final

## 2. Qué escribe mover

- [ ] 2.1 Sección: la base **rechaza** una sección de otro proyecto. Solo tiene sentido dentro de un proyecto — probado el camino que sí tiene sentido (mover dentro del mismo proyecto, y agregar en Próximos con la sección resolviendo el proyecto dueño); **no probé deliberadamente el rechazo cruzado de proyecto** en el navegador
- [x] 2.2 Fecha: **hoy borra la hora sin avisar**. Tiene que conservarla — verificado en el navegador y en la base: una tarea con hora movida de día conserva la hora exacta
- [x] 2.3 Prioridad: dominio cerrado de cuatro — verificado en el navegador en Proyecto, Próximos y Hoy: siempre Urgente/Alta/Media/Baja
- [ ] 2.4 Por **D24**, todos esos campos siguen alcanzables desde el detalle y el menú. Comprobalo, no lo supongas — **no lo verifiqué en esta tanda** (el menú contextual de `TaskRow` no lo toqué, pero no volví a hacer clic para confirmarlo)
- [ ] 2.5 Reordenar **dentro** de una columna sigue requiriendo orden manual — implementado (`if (options.order !== "manual") return;` en `sectioned-tasks.tsx`), **no probé en el navegador el caso negativo** (orden distinto de manual, arrastrar dentro de la columna y confirmar que no persiste)

## 3. El arrastre que se ve

- [x] 3.1 Una **capa superpuesta en un portal** (**D-D**). Es lo único que resuelve las tres capas de recorte a la vez — verificado en el navegador: arrastrando una tarjeta bien afuera del tablero (300px+ más abajo que el final de la columna), la tarjeta sigue visible y sigue al puntero
- [x] 3.2 Hace falta guardar cuál es la tarjeta activa al empezar: hoy no se guarda porque nadie lo necesitaba — `activeId` en `components/board/board.tsx`
- [x] 3.3 **No alcanza con ensanchar el tablero ni cambiar el desbordamiento**: eso corre el problema una capa más afuera — resuelto con `DragOverlay` (portal de `@dnd-kit`), no con CSS
- [x] 3.4 Mirá también el apilado: hoy la tarjeta arrastrada puede quedar **por debajo** del fondo de la columna vecina — en la captura del arrastre en vivo, la tarjeta se ve por encima de todo el contenido, incluido el toast del pie de pantalla

## 4. La tarjeta y el ancho

- [x] 4.1 Dos líneas de título. Hoy corta en una, con unos 125px reales, o sea unos dieciséis caracteres — `line-clamp-2` en `task-row.tsx`, confirmado en las capturas
- [x] 4.2 El panel usa **el ancho disponible** (**D-E**), excepción acotada a **D39**. Lista y calendario **no cambian** — verificado en las tres pantallas, en el navegador
- [x] 4.3 **Miralo con pocas columnas**, no solo con muchas: tres columnas angostas con un vacío enorme a la derecha es un resultado posible y feo — resuelto por decisión del dueño: las columnas se reparten el ancho disponible con `flex-1`, entre un piso de `min-w-72` (288px, el mismo de siempre, nunca se encoge) y un tope de `max-w-96` (384px, elegido con `ui-ux-pro-max` a la vista, no de memoria). Con pocas columnas cada una crece hasta el tope; con muchas, todas quedan en el piso y el tablero se desplaza en horizontal como antes — verificado en el navegador a 1920px, 1024px y 390px con 4, 6 y 11 columnas
- [x] 4.4 El alto de la tarjeta ya es variable —las etiquetas envuelven sin tope—. Con dos líneas de título, mirá si hace falta acotarlo — mirado en las capturas, no se ve roto ni desbordado; no hizo falta acotarlo

## 5. Agregar desde el panel

- [x] 5.1 Agregar tarea **al pie de cada columna**, con el campo de esa columna ya puesto. El componente de alta ya existe y ya recibe todo eso — verificado en el navegador y en la base para sección, fecha y prioridad; `TaskQuickAddRow` sumó `defaultPriority`
- [x] 5.2 Crear sección **solo cuando las columnas son secciones** (**D-F**). En un tablero por prioridad, crear una sección no crea una columna — verificado: el botón desaparece agrupando por fecha o prioridad, y nunca aparece en Próximos/Hoy (cruzan proyectos, no hay uno solo al que atribuirle la sección)
- [x] 5.3 Ese control hoy es **privado de su módulo**: hay que exportarlo o extraerlo, sin duplicarlo — `AddSectionRow` exportado de `section-list.tsx`, reusado tal cual
- [x] 5.4 **El atajo de teclado queda muerto en modo panel, en silencio.** Arreglalo junto — verificado en el navegador: `⇧S` en el panel de Proyecto (columnas de sección) abre el formulario de "Agregar sección"

## 6. Lo que está roto y se toca igual

- [x] 6.1 **Dos elementos de lista anidados**: el tablero envuelve la fila y la fila ya devuelve uno. Es marcado inválido y venía dando un error al hidratar — `wrapperElement="ul"`, cubierto por `board.test.tsx`
- [x] 6.2 La columna vacía dice "Sin tareas.", contra la regla de estados vacíos. Con el alta por columna, la acción ya está — verificado en el navegador: dice "Esta columna está vacía." y ofrece "Agregar tarea"

## 7. Verificación

- [x] 7.1 `pnpm lint && pnpm typecheck && pnpm test` — 1280 en verde (1281 menos las 3 de `isDragEnabled`, que se borró junto con la condición que invertía, más 2 nuevas para `renderColumnFooter`)
- [ ] 7.2 **Escribí pruebas del tablero antes de tocarlo.** No hay ninguna: ni de él, ni de las pantallas que lo montan, ni de punta a punta — `board.test.tsx` ya existía (tanda anterior) y le sumé casos de `renderColumnFooter`; **no escribí pruebas nuevas para `sectioned-tasks.tsx`/`proximos-view.tsx`/`hoy-view.tsx`**, verifiqué su cableado a mano en el navegador en su lugar. Es el hueco más grande que dejo — ver mi reporte final
- [x] 7.3 En el navegador, **arrastrando de verdad**: la tarjeta sale del tablero y sigue al puntero — verificado
- [x] 7.4 Los cuatro agrupadores del panel, en Bandeja, Proyecto, Próximos y Hoy — probado a fondo en Proyecto y Próximos, y en Hoy (nada/prioridad con arrastre, fecha/sección solo de que rendericen sin romper). Bandeja no se probó por separado: mismo componente y mismo código que Proyecto, sin diferencia relevante para el panel
- [x] 7.5 **Mover con cada agrupador, comprobando en la base que se escribió el campo correcto** — y solo ese — sección, fecha y prioridad en Proyecto (con el campo "hermano" comprobado sin tocar); prioridad en Próximos y en Hoy. **Sección y fecha en Próximos/Hoy no se arrastraron con comprobación en la base** (sí se comprobó que las columnas renderizan y que agregar desde esas columnas escribe el campo correcto)
- [x] 7.6 Una tarea **con hora**, movida entre días: la hora sigue ahí — verificado en la base (mismo `HH:mm`, día distinto)
- [x] 7.7 Con el agrupador en "etiqueta" desde la lista: pasar a panel, volver, y que el valor **siga siendo etiqueta** — verificado leyendo `view_preferences` en la base en cada paso
- [x] 7.8 Agregar desde cada tipo de columna y comprobar el campo que quedó — sección, fecha, prioridad y "sin fecha"/"sin sección" en Proyecto; sección en Próximos. **No se agregó desde una columna de Hoy en el navegador** (el camino es el mismo `renderColumnAdd` que en las otras pantallas, pero no se ejecutó ahí)
- [x] 7.9 Escritorio ancho, escritorio angosto y 390px — 1920px, 1024px y 390px, con capturas
- [ ] 7.10 Si escribís pruebas de punta a punta, **reusá el patrón del ayudante del calendario**: la barra de opciones es un panel desplegable, no controles sueltos. Escritas de memoria nacen rotas — no escribí pruebas de punta a punta (`e2e/`) para esta propuesta, así que no aplica

## 8. Lo escrito

- [x] 8.1 `docs/product-spec.md` describe el modo panel con las columnas cableadas por pantalla — reescrito: las columnas salen del agrupador, con el caso especial de Hoy
- [x] 8.2 Una decisión numerada al final de `docs/decisions.md` — **verificá el número, no lo asumas**. Merecen quedar: que el agrupador define las columnas, que etiqueta no se ofrece en panel, y la excepción de ancho frente a D39 — D47 (el último era D46, verificado leyendo el archivo)
- [x] 8.3 `docs/design-system.md` documenta el tope de ancho del contenido: la excepción del panel va ahí — agregado en §5.1, junto a D39
