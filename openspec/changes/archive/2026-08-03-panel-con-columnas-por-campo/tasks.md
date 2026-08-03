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
- [x] 1.7 Agrupar por fecha genera **tantas columnas como días con tareas**. Con tareas repartidas en meses son decenas: mirá qué pasa y contame si hace falta un límite — probado en el navegador con 20 tareas en 8 meses distintos (agosto 2026 a marzo 2027): **24 columnas**, la mayoría con una sola tarea. No rompe ni se cuelga, pero el tablero queda muy angosto por columna y exige scroll horizontal largo para ver una tarea de dentro de unos meses — usable pero incómodo. No inventé ningún límite: queda como decisión del dueño, ver mi reporte final

## 2. Qué escribe mover

- [x] 2.1 Sección: la base **rechaza** una sección de otro proyecto. Solo tiene sentido dentro de un proyecto — probado en el navegador el rechazo cruzado: en Próximos, agrupado por sección (que cruza proyectos, `useAllSections`), arrastrar una tarea de un proyecto a la columna de una sección de **otro** proyecto dispara `tasks_validate_owner_trigger` ("La sección destino no pertenece al proyecto de la tarea"), la escritura se revierte y la tarea queda donde estaba (confirmado recargando la página). **Encontré y arreglé un defecto real de paso**: `reportTaskError` (`lib/tasks/errors.ts`) nunca clasificaba el mensaje real, porque `supabase-js` sin `.throwOnError()` nunca lanza un `instanceof Error` — el `error` es el JSON de la respuesta ya parseado, un objeto plano. Todo error de tarea cae siempre en "desconocido" ("algo falló de nuestro lado"), sin importar la causa; nunca es "un error de base sin traducir" crudo, pero sí es un mensaje genérico y engañoso donde había uno específico disponible. Arreglado con una función que también acepta un objeto plano con `.message` de texto (`lib/tasks/errors.ts`, cubierto por `lib/tasks/errors.test.ts`) — con eso el toast pasó a decir "No pudimos mover la tarea porque el proyecto o la sección de destino no te pertenecen." **El mismo patrón (`error instanceof Error` sobre un error de `supabase-js`) probablemente se repite en `lib/sections/errors.ts`, `lib/projects/errors.ts` y el resto de `lib/*/errors.ts`** — no los toqué, quedan fuera de esta propuesta; ver mi reporte final. **Queda una decisión de diseño sin resolver, que no tomé por mi cuenta**: ¿el panel debería permitir este movimiento reasignando el proyecto (como ya hace "Mover…"), o directamente no ofrecer como columna una sección de otro proyecto? Hoy se ofrece y siempre se rechaza — funciona, pero invita a un gesto que nunca sirve
- [x] 2.2 Fecha: **hoy borra la hora sin avisar**. Tiene que conservarla — verificado en el navegador y en la base: una tarea con hora movida de día conserva la hora exacta
- [x] 2.3 Prioridad: dominio cerrado de cuatro — verificado en el navegador en Proyecto, Próximos y Hoy: siempre Urgente/Alta/Media/Baja
- [x] 2.4 Por **D24**, todos esos campos siguen alcanzables desde el detalle y el menú. Comprobalo, no lo supongas — verificado en el navegador, con clics reales: desde el menú "…" de `TaskRow`, "Fecha" (submenú), "Fecha límite" y "Prioridad" (submenú con las cuatro) están, y "Mover…" abre el diálogo con el proyecto y la sección destino; desde el detalle, "Proyecto" (`TaskDestinationSelect`, con las secciones del proyecto elegido como opciones), "Prioridad" y "Fecha de vencimiento" están los tres, sin arrastrar nada
- [x] 2.5 Reordenar **dentro** de una columna sigue requiriendo orden manual — verificado, pero con una prueba de componente en vez del navegador (más determinístico para una condición pura, sin geometría de arrastre de por medio): `sectioned-tasks.test.tsx` invoca `onReorderWithinColumn` directo con orden "fecha" y confirma que no escribe nada, y con orden "manual" que sí escribe la posición; lo mismo en `proximos-view.test.tsx` y `hoy-view.test.tsx` para sus propios "nunca persiste" (D25, cruzan proyectos)

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

- [x] 7.1 `pnpm lint && pnpm typecheck && pnpm test` — 1308 en verde (1280 + 10 de `sectioned-tasks.test.tsx` nuevo, 8 de `proximos-view.test.tsx` nuevo, 5 sumadas a `hoy-view.test.tsx`, 5 de `lib/tasks/errors.test.ts` nuevo — 1280+28=1308)
- [x] 7.2 **Escribí pruebas del tablero antes de tocarlo.** No hay ninguna: ni de él, ni de las pantallas que lo montan, ni de punta a punta — `board.test.tsx` ya existía; sumé `components/projects/sectioned-tasks.test.tsx` y `components/tasks/proximos-view.test.tsx` (nuevos) y extendí `components/tasks/hoy-view.test.tsx`. Cubren: que "nada" da lo natural de cada pantalla (secciones en Bandeja/Proyecto, días en Próximos, prioridad en Hoy), que cambiar el agrupador cambia las columnas, que el panel de Hoy sigue mostrando solo tareas (ya estaba, sin tocar), y que mover a otra columna escribe el campo correcto por agrupador y pantalla — mockeando `Board` para invocar sus manejadores directo (el arrastre real de `@dnd-kit` no corre en jsdom, así que eso lo sigue verificando el navegador, tarea 7.3)
- [x] 7.3 En el navegador, **arrastrando de verdad**: la tarjeta sale del tablero y sigue al puntero — verificado
- [x] 7.4 Los cuatro agrupadores del panel, en Bandeja, Proyecto, Próximos y Hoy — probado a fondo en Proyecto y Próximos, y en Hoy (nada/prioridad con arrastre, fecha/sección solo de que rendericen sin romper). **Bandeja probada por separado esta tanda** (no se había hecho antes): panel, "Sin sección" con una tarea agregada, y crear una sección directo desde el panel — funciona igual que Proyecto, sin diferencias
- [x] 7.5 **Mover con cada agrupador, comprobando en la base que se escribió el campo correcto** — y solo ese — sección, fecha y prioridad en Proyecto (con el campo "hermano" comprobado sin tocar); prioridad en Próximos y en Hoy; sección en Próximos (dentro del mismo proyecto, con prueba de componente que comprueba el patch exacto — `fromProjectId`/`toProjectId`/`sectionId`). **El caso cruzado de proyecto en sección de Próximos/Hoy se probó aparte, en el navegador** (tarea 2.1): la base lo rechaza, correctamente
- [x] 7.6 Una tarea **con hora**, movida entre días: la hora sigue ahí — verificado en la base (mismo `HH:mm`, día distinto)
- [x] 7.7 Con el agrupador en "etiqueta" desde la lista: pasar a panel, volver, y que el valor **siga siendo etiqueta** — verificado leyendo `view_preferences` en la base en cada paso
- [x] 7.8 Agregar desde cada tipo de columna y comprobar el campo que quedó — sección, fecha, prioridad y "sin fecha"/"sin sección" en Proyecto; sección en Próximos. **No se agregó desde una columna de Hoy en el navegador** (el camino es el mismo `renderColumnAdd` que en las otras pantallas, pero no se ejecutó ahí)
- [x] 7.9 Escritorio ancho, escritorio angosto y 390px — 1920px, 1024px y 390px, con capturas
- [ ] 7.10 Si escribís pruebas de punta a punta, **reusá el patrón del ayudante del calendario**: la barra de opciones es un panel desplegable, no controles sueltos. Escritas de memoria nacen rotas — no escribí pruebas de punta a punta (`e2e/`) para esta propuesta, así que no aplica

## 8. Lo escrito

- [x] 8.1 `docs/product-spec.md` describe el modo panel con las columnas cableadas por pantalla — reescrito: las columnas salen del agrupador, con el caso especial de Hoy
- [x] 8.2 Una decisión numerada al final de `docs/decisions.md` — **verificá el número, no lo asumas**. Merecen quedar: que el agrupador define las columnas, que etiqueta no se ofrece en panel, y la excepción de ancho frente a D39 — D47 (el último era D46, verificado leyendo el archivo)
- [x] 8.3 `docs/design-system.md` documenta el tope de ancho del contenido: la excepción del panel va ahí — agregado en §5.1, junto a D39
