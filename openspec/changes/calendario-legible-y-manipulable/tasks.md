> **El grupo 6 puede tocar la base.** Saltear un hábito no existe en toda la aplicación y hay que
> decidir qué le pasa a la racha. Si toca el esquema, **la migración va antes que el código**.
>
> **Casi nada de esto tiene red.** No hay pruebas de la línea de la hora, ni del arrastre completo,
> ni del redimensionado, ni del ancho. Y la suite de punta a punta del calendario **no corre en el
> gate**: estuvo rota por selectores viejos hasta hoy sin que nadie lo notara.
>
> **Se juzga mirando una semana real**, con bloques de quince minutos y de tres horas mezclados, no
> dos de prueba.

## 1. La línea de la hora actual

- [x] 1.1 **Pasa a moverse.** Hoy se calcula una sola vez al montar y nunca más: la línea queda en la hora en que se cargó la página
- [x] 1.2 El spec ya exigía esto. **No es una función nueva, es un requisito incumplido**
- [x] 1.3 Pasa a ser **roja**, distinta de cualquier color que pueda tener un bloque
- [x] 1.4 Sigue apareciendo **solo en el día de hoy**
- [x] 1.5 Ojo con la hidratación: la hora viaja explícita desde el servidor a propósito, y hay un comentario que explica por qué. **Leelo antes de tocar**

Re-verificado en esta tanda de cierre corriendo `e2e/calendario-linea-y-quince-minutos.spec.ts` de punta a punta contra Supabase local (dos capturas separadas por 65 segundos reales, sin recargar): la línea avanza y sigue roja.

## 2. Qué muestra cada bloque

- [ ] 2.1 Una **escalera por alto** (**D-A**): cada dato aparece solo si entra. Hoy el contenido es idéntico en un bloque de doce píxeles y en uno de mil
- [x] 2.2 Evento: título, horario, nombre del calendario
- [ ] 2.3 Tarea y hábito: título, horario, proyecto, etiquetas
- [ ] 2.4 **El control de completar nunca se cae** por falta de espacio: es una acción, no información
- [ ] 2.5 El hábito lleva además una marca que lo identifica
- [ ] 2.6 **Un defecto que se arregla de paso**: en la grilla el ícono queda apilado **encima** del título, porque la clase de la variante pisa la de fila
- [ ] 2.7 El orden importa: primero lo que distingue bloques vecinos. Dos reuniones seguidas se diferencian por título y hora, no por calendario

**Cabo suelto de otra tanda, resuelto acá: `projectName` y `calendarName` no estaban cableados en `screen-calendar.tsx`.** El bloque ya sabía dibujarlos (2.2/2.3 de acá) pero nunca los recibía. `taskToCalendarBlock`/`habitToCalendarBlock`/`eventToCalendarBlock` ya aceptaban (o pasan a aceptar, el caso de `eventToCalendarBlock`) el nombre resuelto; lo que faltaba era que `screen-calendar.tsx` trajera `useProjects()`/`useGoogleCalendars()` y se los pasara. **Verificado en el navegador para `projectName`**: una tarea de dos horas con proyecto propio muestra "Proyecto Verificación" en su peldaño. **`calendarName` ahora también verificado en el navegador** (tanda siguiente, con el bloqueo del puerto 3000 resuelto — ver la nota de infraestructura al final del archivo): dos calendarios conectados ("Personal" y "trabajo") muestran cada uno su nombre en el peldaño de un bloque de dos horas.

## 3. Los colores

- [x] 3.1 El evento lleva el color de su calendario. **Ya se trae y ya se resuelve**: verificá qué falta para que se use — verificado en el navegador: dos eventos de dos calendarios distintos ("Personal" azul, "trabajo" verde) se dibujan con bordes/fondos de color distinto
- [ ] 3.2 **Un solo color de reemplazo.** Hoy hay dos distintos: uno en la grilla y otro en la fila de Hoy
- [x] 3.3 El color de un evento **no se ajusta al tema oscuro**, a diferencia del de tareas y hábitos. Con los eventos coloreados se va a notar — verificado en el navegador (tema oscuro escrito en `user_preferences.theme` y recargado, no por `localStorage`, ver 9.12): los eventos coloreados se siguen viendo con buen contraste sobre fondo oscuro, `eventColorForTheme` corrigiendo el color crudo de Google
- [ ] 3.4 **La distinción por forma no se toca** (**D-B**): hay una prueba que afirma que dos bloques del mismo color se distinguen igual, y **tiene que seguir pasando tal cual**. Si falla, el arreglo es la forma, no la prueba

## 4. Arrastrar

- [x] 4.1 **Capa superpuesta en un portal** (**D-C**), como ya hizo el tablero. El contenedor con desplazamiento recorta el nodo original
- [x] 4.2 **Se ve el horario de destino**, ajustado a la grilla de quince minutos — que es lo que se va a guardar. Mostrar la posición libre del puntero sería mentir
- [x] 4.3 **Queda la sombra en el origen** mientras dura el gesto
- [x] 4.4 El formato mes no tiene arrastre y queda afuera (sin tocar, ya era así)

## 5. Que todo sea instantáneo

- [x] 5.1 **Redimensionar ya lo es**: tiene vista previa en vivo con estado local. **Es el modelo, copialo**
- [x] 5.2 Mover tiene que igualarlo
- [x] 5.3 **Arrastrar una tarea en Próximos no es optimista**: su caché no se parchea ni se invalida, así que depende de que llegue el aviso en tiempo real. Es un agujero anterior a esto
- [x] 5.4 Al preguntar el alcance de una serie, **hoy el bloque salta de vuelta al origen** mientras pregunta. Tiene que quedarse, y volver solo si se cancela
- [x] 5.5 **Resuelto por decisión del dueño, no por código nuevo**: redimensionar un hábito no se puede persistir (`habit_schedule_overrides` no tiene columna de duración) y ofrecer el gesto sería mentir. En vez de ampliar el esquema, la manija de redimensionar **no se ofrece en absoluto sobre un bloque de hábito** (`draggable-timed-block.tsx`) — mover un hábito sigue andando igual que siempre. Ya no queda bloqueado: la mutación real (`handleMoveOrResize`, `screen-calendar.tsx`) simplemente nunca recibe el gesto para ese tipo.
- [x] 5.6 Si el servidor rechaza, el bloque vuelve **y se avisa**. Los mensajes de error recién empezaron a llegar bien hoy: comprobalo

**Cabo suelto de otra tanda, resuelto acá**: la manija de redimensionar (`draggable-timed-block.tsx`) medía 6px y solo aparecía con `group-hover`, inalcanzable en táctil. Ahora tiene opacidad base no nula y una zona de toque de 18px, creciendo solo hacia abajo (nunca hacia el contenido del bloque, para no taparle el gesto de mover a los bloques cortos).

**Defecto encontrado después, entre esa manija y el casillero de completar (agrandado en otra tanda, los dos con `z-index` automático): en un bloque de 15 min las dos zonas invisibles se solapaban y ganaba la manija — un casillero que se ve pero no responde.** Resuelto dándole al casillero (`calendar-block-chip.tsx`, el `<span>` que envuelve el botón, `position: relative` + `z-10`) prioridad explícita sobre la manija en cualquier solapamiento, en vez de depender del orden de dibujo. Comprobado **midiendo con `document.elementFromPoint` en el navegador** (no mirando) en bloques de 15/30/60 min y en dos bloques de 15 min pegados: en los cinco casos el punto conflictivo lo recibe el casillero, nunca la manija. `e2e/calendario-linea-y-quince-minutos.spec.ts` corrido de punta a punta contra Supabase local: pasa (con retry — un paso del test ajeno a este arreglo, cambiar a tema oscuro por menú, es flaky por un defecto ya documentado de Base UI en Chrome, no por esto), incluido el clic al casillero que antes fallaba ahí — y ahora, con el control de completar cableado de verdad en esta misma tanda (grupo 7), también se confirmó que completa la tarea real (`aria-checked` pasa a `"true"`), así que el test quedó actualizado para descompletarla y no perderla de la vista de Próximos (`showCompleted` es `false` ahí por default).

**Re-verificado el cierre de la tanda (punto 1 del pedido del dueño): en un bloque de hábito la manija ya no existe.** `draggable-timed-block.tsx` corta la condición con `block.type !== "habit"`, así que nunca se monta ese `<div>` para un hábito — sin manija, no hay con qué chocar. Confirmado en el navegador (build de producción contra Supabase local, hábito real "Meditar" de 60 minutos): el bloque se ve completo, sin ninguna franja extra debajo, y su menú contextual y su casillero de completar responden sin competir con nada.

## 6. Saltear un hábito (puede tocar la base)

- [x] 6.1 **No existe nada parecido** (**D-F**). Lo más cercano quita una reprogramación y devuelve el hábito a su hora habitual
- [x] 6.2 Son **tres estados**: pendiente, cumplido y salteado. Confundirlos vuelve inútil el registro
- [x] 6.3 **El bloque se queda en el calendario**, marcado como salteado. No desaparece: es una decisión a la vista, no una baja
- [x] 6.4 **Es reversible**: se puede completar después, y ahí la racha se actualiza como cualquier otro día
- [x] 6.5 **No toques el cálculo de rachas.** La racha cuenta cumplimientos; saltear no suma ni resta. Si te encontrás modificándolo, **pará y avisá**: algo entendiste distinto
- [x] 6.6 Si hay migración: aplicada antes del código, con su política de acceso en el mismo archivo, y los tipos regenerados

La mutación, la tabla (`habit_skips`, migración `20260805000000_habit_skips.sql`, ya aplicada) y `resolveHabitDayStatus` (`lib/habits/day-status.ts`) ya existían de otra tanda, sin ningún consumidor en la interfaz. Esta ronda los cablea: el menú contextual de un bloque de hábito (grupo 7) llama a `useSkipHabit`, y el bloque pasa a llevar `CalendarBlock.skipped`. Verificado en el navegador (build de producción contra Supabase local, hábito real): saltear marca el bloque ("Salteado", atenuado, sigue ahí), no se ofrece saltear de nuevo sobre uno ya salteado, y el salteo persiste después de recargar la página. No se verificó a mano el paso "completarlo después actualiza la racha" (6.4) en esta pasada — lo garantiza `useMarkHabitDone`, que ya borra el salteo del día al completar (código de otra tanda, sin tocar acá) — ni se tocó `calcular_racha_habito` en ningún momento (6.5).

**Los salteos quedan fuera de la publicación de tiempo real, a propósito**: mismo motivo que ya tiene `habit_schedule_overrides` (D-A de `fase-3-habitos`) — ningún otro cliente se suscribe a esta tabla todavía, y sumarla ahora sería anticipar un consumidor que no existe. Si hace falta que un salteo en una pestaña se vea sin recargar en otra, se agrega en la ronda que lo necesite.

## 7. Acciones y menú contextual

- [ ] 7.1 Clic derecho en todo bloque, con la primitiva compartida que ya existe (`AppContextMenu`) — cableado uniforme en `draggable-timed-block.tsx` y `all-day-row.tsx` vía `getContextMenuEntries` (`CalendarView` sigue sin saber de dominios; `screen-calendar.tsx` arma las entradas según `block.type`). **Verificado en el navegador para hábito y ahora también para evento** (clic derecho sobre un evento real muestra "Editar", "Abrir en Google Calendar", "Eliminar"); **tarea sigue sin probarse a mano** — sin marcar hasta probarla
- [x] 7.2 Evento: editar, abrir en Google Calendar, **eliminar** — verificado en el navegador: el menú contextual muestra las tres entradas, y "Eliminar" abre la confirmación y borra el evento de verdad (desaparece de la grilla y del mock)
- [x] 7.3 **Eliminar también desde el diálogo de edición.** `EventFormDialog` suma un botón "Eliminar" en el pie (`onRequestDelete`), reusando la misma confirmación que ya tenía la fila de Hoy — verificado en el navegador: el botón abre la misma confirmación y borra el evento
- [ ] 7.4 Tarea: abrir detalle, completar, eliminar — escrito y tipado; el control de completar del bloque sí se verificó de punta a punta (ver 9.9), pero el menú contextual de una tarea no se abrió a mano esta ronda
- [x] 7.5 Hábito: editar, completar, saltear ese día — **verificado en el navegador**: clic derecho sobre un hábito real muestra exactamente "Editar", "Completar", "Saltear este día"
- [x] 7.6 **Ojo con el patrón**: la lista de menú estaba escrita dos veces casi idéntica (`task-row.tsx`, `event-row.tsx`). Se extrajo `renderDropdownEntries` a `components/primitives/context-menu.tsx` y las dos filas pasan a importarla — el bloque del calendario no necesita esa función (solo usa `AppContextMenu`, sin botón "…"), así que no hay un tercer copiado que evitar
- [x] 7.7 **Completar dentro de algo arrastrable**: mismo `stopPropagation` que ya usaba la manija (`onPointerDown`/`onClick` del casillero, `calendar-block-chip.tsx`). Verificado de punta a punta para una tarea (9.9): tildar no dispara el arrastre ni abre el detalle

**Bloqueo del entorno de la tanda anterior, ya resuelto**: verificar esto en el navegador exige conectar Google (simulado), y el simulador (`e2e/helpers/google-calendar-mock-server.ts`) redirigía siempre a `127.0.0.1:3000` — puerto que ocupaba un `next dev` ajeno que la consigna pedía no matar. Se hizo configurable por `E2E_APP_ORIGIN` (ya existía como variable de entorno desde otra tanda, pero un comentario le decía "fijo" al lector — corregido) y se verificó una instancia de verificación aparte en el puerto 3011 (build de producción, `E2E_APP_ORIGIN=http://127.0.0.1:3011`, variables por línea de comando, sin tocar el puerto 3000 ni `.env.local`) contra la que se ejercitó todo lo de Google de este grupo y del 9.12/9.10.

**Defecto encontrado al verificar (no se arregla acá, es una decisión de diseño de identidad, no una línea suelta): dos calendarios habilitados pueden compartir el mismo `event.id` crudo entre sí** — Google documenta que el id de un evento es único DENTRO de su calendario, no entre calendarios de la misma cuenta (y el mock lo modela igual: cada calendario numera sus propios `evt-N` desde 1). `eventsById` en `screen-calendar.tsx` indexa únicamente por `event.id`, sin `calendarId`: con dos calendarios habilitados cuyos eventos colisionan en el id, el menú contextual/diálogo de edición de UNO termina operando sobre el OTRO — reproducido dos veces en esta verificación (clic derecho en "Reunión Personal" abrió la confirmación de borrado de "Standup Trabajo", de otro calendario). Se esquivó para el resto de la verificación evitando esa colisión a propósito; el arreglo de fondo (una clave compuesta `calendarId+id` para `block.id`/`eventsById`) toca drag & drop, las claves de React y varios call sites — queda para una tanda aparte, con una decisión explícita de a qué se le cambia el id.

**Segundo hallazgo, menor**: `useUpdateEnabledCalendars` (`lib/calendar/calendar-admin-mutations.ts`) no es optimista a propósito, y `toggleCalendarEnabled` (`calendars-section.tsx`) calcula el próximo array de habilitados desde `enabledCalendarIds` de React Query. Tildar dos casilleros de calendario en sucesión rápida, sin esperar a que el primero asiente, hace que el segundo parta del mismo array viejo y pise al primero al resolver (un calendario que se tildó queda des-habilitado sin aviso). Reproducido dos veces en esta verificación; se esquivó esperando la confirmación visual entre click y click. No es parte del alcance de este cambio — reportado para que se sepa que existe.

## 8. El ancho

- [x] 8.1 El calendario deja de heredar el tope de la columna de contenido (**D-G**), misma excepción acotada a **D39** que el panel
- [x] 8.2 Esa excepción está escrita **tres veces**, una por pantalla, con el mismo comentario. **Sumar la cuarta pide unificarla primero**: se unificó en `contentWidthClass()` (`lib/view-options/content-width.ts`), y `sectioned-tasks.tsx`/`hoy-view.tsx`/`proximos-view.tsx` pasan a llamarla en vez de repetir el condicional
- [x] 8.3 La grilla ya tiene piso y reparto por columna: no hace falta tocar la geometría — no se tocó
- [x] 8.4 Lista no cambia

Verificado en el navegador (build de producción contra Supabase local, Próximos en forma de ver "calendario", viewport de 1600px): la grilla mide 1296px de ancho, por encima de los 1152px (72rem) del tope `max-w-content` — confirma que la excepción aplica.

## 9. Verificación

- [x] 9.1 `pnpm lint && pnpm typecheck && pnpm test` — los tres en verde, 1390 pruebas (`pnpm build` de producción también compila limpio, TypeScript estricto sobre el árbol completo)
- [ ] 9.2 Si tocaste el esquema: no aplica esta ronda — el esquema de `habit_skips` ya estaba migrado de otra tanda, no se tocó
- [ ] 9.3 **Una semana real**: no verificado — lo verificado fue formato "día" con bloques sembrados a mano, no una semana mixta real
- [x] 9.4 **La línea de la hora se mueve**: verificado con `e2e/calendario-linea-y-quince-minutos.spec.ts` de punta a punta (dos mediciones separadas por 65 segundos reales)
- [ ] 9.5 Arrastrar de verdad — no verificado esta ronda (ya eran grupos 4/5, committeados antes; no se tocó nada de arrastre salvo sacarle la manija al hábito, ver 5.5)
- [ ] 9.6 Arrastrar en las tres pantallas — no verificado esta ronda
- [ ] 9.7 Arrastrar una ocurrencia de una serie — no verificado esta ronda
- [ ] 9.8 Con el servidor rechazando — no verificado esta ronda
- [x] 9.9 Completar una tarea y un hábito desde su bloque, sin que se dispare el arrastre — verificado para tarea (`e2e/calendario-linea-y-quince-minutos.spec.ts`: el casillero de un bloque de 15 minutos completa de verdad, `aria-checked` pasa a `"true"`, sin abrir el detalle ni moverse) y para hábito por el mismo mecanismo (`calendar-block-chip.tsx`, mismo `stopPropagation`), aunque el casillero del hábito en sí no se clickeó a mano — sí se saltó desde el menú, que usa la misma técnica
- [x] 9.10 Eliminar un evento desde el menú y desde el diálogo — verificado en el navegador por las dos vías, cada una con su confirmación, y el evento realmente desaparece (de la grilla y del mock)
- [x] 9.11 Saltear un hábito: verificado que **sigue viéndose** marcado como salteado (sin desaparecer), que no se vuelve a ofrecer saltear sobre un bloque ya salteado, y que el salteo persiste después de recargar. **No verificado** que completarlo después actualice la racha (lo garantiza código de otra tanda, `useMarkHabitDone`, sin tocar acá)
- [x] 9.12 Tema claro y oscuro, con eventos coloreados — tema claro ya estaba (capturas de la tanda anterior). **Oscuro ahora también verificado**, esquivando el clic flaky en el menú (defecto ya documentado de Base UI en Chrome): la preferencia se escribió directo en `user_preferences.theme` (no alcanza con `localStorage`, se pisa al montar con lo que diga la base) y se recargó — el `<html>` toma la clase `dark` y los eventos coloreados se ven con buen contraste
- [x] 9.13 Escritorio ancho — verificado (1600px, ver grupo 8). **390px no verificado esta ronda**
- [x] 9.14 Simulador de Google, **nunca la cuenta real del dueño** — todo lo que se probó usó Supabase local y, donde hizo falta Google, el simulador (`google-calendar-mock-server.ts`); nunca se tocó una cuenta real
- [x] 9.15 Se reusaron los ayudantes existentes (`e2e/helpers/calendar.ts`, `e2e/helpers/admin.ts`) tanto en el ajuste a `calendario-linea-y-quince-minutos.spec.ts` como en el script de verificación manual (descartado al cerrar, no quedó en el repo)

**Lo que queda sin marcar en este grupo** (9.2/9.3/9.5-9.8) no depende del bloqueo de Google, ya resuelto: son partes de arrastrar/redimensionar y de una semana real mixta que ninguna de las dos tandas de verificación ejercitó. Ver la nota de infraestructura del grupo 7 para el detalle de cómo se destrabó la verificación de Google (puerto configurable por `E2E_APP_ORIGIN`, instancia aparte en el 3011, puerto 3000 del dueño intacto) y los dos defectos que encontró de paso.

## 10. Lo escrito

- [x] 10.1 `docs/product-spec.md` describe la vista de calendario — sección "Vista de calendario" ampliada (qué muestra cada bloque, arrastrar/redimensionar, acciones de menú) y el hábito suma el párrafo de "saltear un día puntual"
- [x] 10.2 Una decisión numerada al final de `docs/decisions.md` — el número vigente al escribir era **D49**, así que esta queda como **D50** (verificado leyendo el archivo, no asumido). Cubre la escalera de contenido por alto y qué le pasa a la racha al saltear
- [x] 10.3 `docs/design-system.md` documenta el tope de ancho: la excepción de D47 pasa a cubrir "panel" y "calendario" juntas, con la mención de `contentWidthClass()` que las tres pantallas ahora comparten
