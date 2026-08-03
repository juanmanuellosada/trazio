> **El grupo 1 es bloqueante**: sin el nombre de la sección no hay qué dibujar en el chip.
>
> **Casi todo el cambio visual vive en un solo archivo**, `components/tasks/task-row.tsx`. Lo
> que lo agranda es decidir en las nueve superficies si muestran el proyecto.
>
> **El gate en verde no dice nada acá.** Esto se juzga mirando una lista real con tareas
> variadas —algunas con fecha, otras sin nada, algunas con subtareas— no tres de prueba.

## 1. El nombre de la sección (bloqueante)

- [ ] 1.1 Una consulta **mayorista y cacheada** de todas las secciones del usuario, sembrada como ya se hace con los proyectos
- [ ] 1.2 **Nunca de a un proyecto por vez.** Es el patrón que prohíbe `.claude/rules/database.md`, y en una lista que cruza proyectos sería una consulta por fila
- [ ] 1.3 El nombre del proyecto **ya está en memoria**: no agregues nada para eso
- [ ] 1.4 **Si esa consulta resulta cara** —muchas secciones, o pesa en el arranque—, **pará y avisame**. Mostrar solo el proyecto es una degradación aceptable; esconder una consulta lenta detrás de un chip no

## 2. Los dos niveles

- [ ] 2.1 Nivel uno: título, con proyecto y sección **anclados al borde derecho**
- [ ] 2.2 Nivel dos: fecha y etiquetas
- [ ] 2.3 **Cada nivel se renderiza solo si tiene contenido** (**D-A**). Una tarea sin fecha ni etiquetas queda en una línea
- [ ] 2.4 **No toques el tope de ancho del título ni el de la columna.** El botón del título ya llega al borde derecho: anclar algo ahí no requiere tocar ninguno de los dos
- [ ] 2.5 Mirar una lista con **tareas de una y de dos alturas mezcladas**. Es el costo real de esta propuesta y donde puede verse peor que hoy

## 3. El chip, y dónde va

- [ ] 3.1 **Al lado del botón del título, nunca adentro** (**D-C**). Adentro cambiaría el nombre accesible de la tarea —"Pagar el alquiler" pasaría a ser "Pagar el alquiler Trabajo"— y **rompería siete pruebas** que buscan tareas por su nombre
- [ ] 3.2 Que no se coma el título: necesita no encogerse y truncar por su cuenta
- [ ] 3.3 **Ojo con una prueba frágil**: hay una que detecta el punto de prioridad con un selector de CSS crudo, por ser redondo y estar oculto a los lectores. Un chip con esas dos características la rompe

## 4. Dónde se muestra el proyecto

- [ ] 4.1 **Decisión explícita en cada montaje** (**D-B**). No lo derives del tratamiento visual: el tablero de un proyecto y agrupar por prioridad dentro de un proyecto son compactos y ahí el proyecto sobra
- [ ] 4.2 Lo muestran: Hoy, Próximos, Etiqueta, Filtro, Buscador, Completado
- [ ] 4.3 No lo muestran: Bandeja, Proyecto, sección, subtareas del detalle, tablero de Bandeja y de Proyecto
- [ ] 4.4 En la página de una etiqueta, fijate si conviene además **no repetir esa etiqueta** en cada fila: ya la dice el encabezado

## 5. Las líneas

- [ ] 5.1 Línea entre tareas hermanas, **más tenue** que la de sección (**D-E**)
- [ ] 5.2 La de sección se destaca más. Ya existe un separador en el sistema de diseño: usalo, no inventes
- [ ] 5.3 **Sin línea** debajo de la última tarea, entre subtareas, ni en una sección colapsada

## 6. El teléfono

- [ ] 6.1 En 390px el título mide unos 216px, y con dos etiquetas y hora queda en 60 u 80. **Es el peor caso de hoy**
- [ ] 6.2 El segundo nivel **lo mejora mucho**: fecha y etiquetas pasan a tener el ancho entero
- [ ] 6.3 **Pero el proyecto a la derecha lo empeora**: le saca al título otros 60 a 100px. Resolvelo distinto ahí —bajarlo al segundo nivel, reducirlo, o no mostrarlo— y contá qué elegiste (**D-F**)

## 7. Verificación

- [ ] 7.1 `pnpm lint && pnpm typecheck && pnpm test`
- [ ] 7.2 **Las siete pruebas que buscan tareas por su nombre siguen pasando.** Si fallan, el chip quedó adentro del botón
- [ ] 7.3 **Mirar una lista real y variada**: tareas con fecha, sin nada, con muchas etiquetas, con títulos largos, con subtareas
- [ ] 7.4 Recorrer las nueve superficies y comprobar dónde aparece el proyecto y dónde no
- [ ] 7.5 En la Bandeja, donde la mayoría de las tareas es un título suelto: que **no haya cambiado casi nada** — es la prueba de que los niveles vacíos colapsan
- [ ] 7.6 **Todo lo de la fila que se agregó hoy sigue funcionando**: clic derecho, `Ctrl`+clic, doble clic, arrastre, casilla de selección, `Tab` para indentar, y los seis atajos con el menú abierto
- [ ] 7.7 El tablero **no cambió**
- [ ] 7.8 En escritorio y en 390px

## 8. Lo escrito

- [ ] 8.1 La sección 5.1 de `docs/design-system.md` describe el layout de la fila y su tope, y queda desactualizada. **Es el único lugar donde eso está escrito**
- [ ] 8.2 Sumar una decisión numerada a `docs/decisions.md`: hoy no hay ninguna sobre la fila de tarea, y este cambio merece una. El registro **no se reescribe**: se agrega al final
