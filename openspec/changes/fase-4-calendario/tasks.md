> **Antes de empezar, hay tareas del dueño del proyecto.** El grupo 0 no lo hace
> ningún agente: son credenciales, variables de entorno y texto legal. La
> implementación puede arrancar sin ellas hasta el grupo 2, pero nada se puede
> probar de punta a punta hasta que estén.
>
> **Cómo se ejecutan las tandas.** El grupo 1 es bloqueante. Los grupos 3 y 4
> corren **en paralelo** tras el 2. El grupo 6 espera al 5. El **grupo 7 es dueño
> único de los archivos compartidos** —barra de opciones, atajos, configuración,
> panel lateral—: ninguna otra tanda los toca.
>
> Nadie corre `git stash`, `git reset` ni `git checkout` en una tanda paralela.
>
> `pnpm lint && pnpm typecheck && pnpm test` en verde no alcanza para dar una tanda
> por terminada: cada una se verifica abriendo el navegador. El arrastre y las
> series recurrentes **solo** se pueden verificar a mano.

## 0. Tareas del dueño del proyecto *(no las hace ningún agente)*

- [ ] 0.1 Crear el proyecto y las credenciales en Google Cloud siguiendo `docs/setup-google-calendar.md`, con el permiso `calendar` completo
- [ ] 0.2 Cargar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI` en local y en Vercel
- [ ] 0.3 Generar la clave de cifrado de 32 bytes y cargarla como variable de servidor, nunca expuesta al navegador
- [ ] 0.4 Actualizar la política de privacidad **antes** de activar la conexión: se empiezan a mandar datos a un tercero (D20, el texto lo provee el dueño)
- [ ] 0.5 Iniciar la verificación de Google apenas la fase funcione en desarrollo, no cuando se quiera lanzar

## 1. Esquema y cifrado (bloqueante)

- [x] 1.1 Migración `calendar_connections` con su RLS en el mismo archivo: `user_id` como PK, `provider`, `refresh_token`, `enabled_calendar_ids`, `status`
- [x] 1.2 `lib/calendar/crypto.ts`: cifrar y descifrar con AES-256-GCM, guardando nonce y tag junto al ciphertext
- [x] 1.3 Tests del cifrado: ida y vuelta, y que un ciphertext manipulado **falla** en vez de devolver basura
- [x] 1.4 Que la clave se lea solo del lado servidor, y un test que falle si alguien la expone en una variable pública
- [x] 1.5 Regenerar tipos con `pnpm db:types:local` (nunca `db:types`, que apunta al remoto)
- [x] 1.6 Tests de RLS de `calendar_connections`: un usuario no ve ni escribe la conexión de otro

## 2. OAuth y cliente de Google *(tras el grupo 1)*

- [x] 2.1 `app/api/auth/google/route.ts`: inicio del flujo con `access_type=offline` y `prompt=consent`, sin los cuales Google no devuelve refresh token
- [x] 2.2 `app/api/auth/google/callback/route.ts`: intercambiar el código por tokens, cifrar el refresh token y guardar la conexión
- [x] 2.3 Protección contra CSRF en el flujo con el parámetro `state`
- [x] 2.4 `lib/calendar/google-client.ts`: llamadas con `fetch`, sin `googleapis` (decisión D-B)
- [x] 2.5 Refresco del access token, y marcar la conexión como `needs_reauth` cuando el refresh falla
- [x] 2.6 Desconectar la cuenta: borra la conexión y **no** toca ningún dato de Trazio
- [x] 2.7 Listar los calendarios del usuario y guardar cuáles se muestran en `enabled_calendar_ids`
- [x] 2.8 Tests del cliente con la API de Google simulada: token vencido, refresh fallido, 429 y 500

## 3. Eventos *(paralelo tras el grupo 2)*

- [x] 3.1 `lib/calendar/events.ts`: leer eventos por rango de los calendarios habilitados
- [x] 3.2 Caché en memoria del servidor, 60 segundos, por usuario, calendario y rango (decisión D-C)
- [x] 3.3 Los eventos **no** se guardan en la base: verificar que no hay ninguna tabla ni columna que los persista — automatizado en `lib/calendar/events-not-persisted.test.ts`, que escanea `supabase/migrations/`
- [x] 3.4 Crear, editar y eliminar eventos
- [x] 3.5 Las tres formas de aplicar un cambio sobre una serie recurrente: esta ocurrencia, esta y las siguientes, todas — cada una es una llamada distinta. "Esta y las siguientes" no tiene endpoint propio en la API de Google: se implementó partiendo la serie en dos eventos (truncar el maestro con `UNTIL`/`COUNT` + crear una serie nueva que continúa desde ahí), el mismo mecanismo que usa el cliente web de Google Calendar — **sin verificar contra Google real** (grupo 0 pendiente), solo contra la documentación de la API y la API simulada (`lib/calendar/recurrence-scope.test.ts`, `lib/calendar/events.test.ts`)
- [x] 3.6 El diálogo que pregunta cuál aplicar, sin opción por defecto silenciosa, diciendo a cuántas ocurrencias afecta — `components/calendar/recurrence-scope-dialog.tsx`; el alcance se explica en texto (no con un número, que no existe para una serie sin fin)
- [x] 3.7 Degradación cuando la API falla: se muestran tareas y hábitos y se avisa que los eventos no cargaron. Nunca pantalla en blanco ni spinner infinito — resuelto a nivel de datos (`getEventsForRange` nunca lanza por una falla esperada de Google, devuelve un estado explícito); la pantalla que lo consuma (grupo 5/7) todavía no existe
- [x] 3.8 Verificar que ninguna tarea ni hábito de Trazio se publica en Google — automatizado en `lib/calendar/tasks-and-habits-never-publish-to-google.test.ts`, que escanea que nada bajo `lib/tasks/`, `lib/habits/`, `components/tasks/` o `components/habits/` importe de `lib/calendar/`
- [x] 3.9 Tests de las tres formas de editar una serie, con la API simulada — cubre además 429, 500 y token vencido en cada forma

## 4. Administración de calendarios *(paralelo tras el grupo 2)*

- [x] 4.1 `lib/calendar/calendars.ts`: crear, renombrar, recolorear y eliminar
- [x] 4.2 Interfaz de administración en la sección Calendarios de Configuración
- [x] 4.3 El color sale de lo que Google admite, no de la paleta fija de Trazio — anotar la tensión con D19
- [x] 4.4 Eliminar pide confirmación advirtiendo que **el calendario se borra de la cuenta de Google entera**, no solo de Trazio
- [ ] 4.5 Verificar contra la API real que `calendars.delete` hace exactamente eso antes de escribir esa advertencia — **sin verificar todavía**: no hay credenciales de Google cargadas (grupo 0 pendiente, `.env.local` no tiene `GOOGLE_CLIENT_ID` ni relacionadas). Se verificó contra la documentación oficial de `calendars.delete` ("Deletes a secondary calendar. Use calendars.clear for clearing all events on primary calendars.") y de `calendarList.patch`/`colors` para el color, no contra la API real. Falta repetir esta verificación con una cuenta de Google real en cuanto el grupo 0 cargue las credenciales.

## 5. La grilla del calendario *(tras los grupos 3 y 4)*

- [x] 5.1 `components/calendar/`: grilla de 24 horas con la fila de todo el día arriba y la línea de la hora actual
- [x] 5.2 Los cuatro formatos: día, cuatro días, semana y mes
- [x] 5.3 El layout se adapta por ancho, sin prohibir formatos por dispositivo (decisión D-E) — verificado a mano en escritorio y en 390px con los cuatro formatos
- [x] 5.4 Modelo común de bloque para tareas, hábitos y eventos: la grilla no conoce sus dominios (decisión D-F) — `lib/calendar/block.ts`
- [x] 5.5 Los tres tipos se distinguen **por forma**, no solo por color — verificado a mano con los tres tipos forzados al mismo color
- [x] 5.6 Solapamientos: dos bloques a la misma hora se reparten el ancho sin taparse
- [x] 5.7 Bloques de vista previa de repeticiones futuras, acotados al rango visible y no interactivos
- [x] 5.8 Tests de la disposición: solapamientos, eventos de todo el día, y un evento que cruza la medianoche — `lib/calendar/layout.test.ts`

## 6. Arrastrar y redimensionar *(tras el grupo 5)*

- [x] 6.1 Arrastrar un bloque cambia su horario, con ajuste a 15 minutos — `lib/calendar/drag.ts` (`moveBlockToPosition`/`snapToQuarterHour`), mecánica de arrastre en `components/calendar/draggable-timed-block.tsx` + `time-grid.tsx` + `all-day-row.tsx` (una tarea de todo el día también se puede arrastrar hacia la grilla). Verificado a mano: mover una tarea con hora y una tarea sin hora contra el Docker local.
- [x] 6.2 Estirar el borde cambia la duración, con el mismo ajuste — manija de redimensionar en `draggable-timed-block.tsx` (seguimiento nativo de puntero, no `@dnd-kit`: estirar no es "soltar sobre un contenedor"). Verificado a mano: 30 minutos → 60 minutos, persistido en `duration_minutes`.
- [x] 6.3 Cada tipo traduce el movimiento a su propia mutación — `lib/calendar/block-drag-translate.ts` (`taskDragPatch`/`habitDragOverride`/`eventDragChanges`), funciones puras que quien monte la pantalla (grupo 7) llama según `block.type`. Tarea y hábito verificados de punta a punta contra el Docker local; evento solo cubierto por el traductor puro + `lib/calendar/use-create-event.ts` (sin credenciales de Google, ver nota de la tarea 6.8).
- [x] 6.4 Mover una tarea sin hora a una hora concreta la pasa de `due_date` a `due_at` — `taskDragPatch` en `block-drag-translate.ts`, reusando `useUpdateTask` (ya optimista). Verificado a mano contra el Docker local: `due_date` queda en `null`, `due_at` con el instante correcto.
- [x] 6.5 Ampliar `assertAppliesOnDate` en `lib/habits/schedule-overrides.ts` para que acepte cualquier día en que el hábito toque (D-H): ahora también rechaza un día anterior a la creación y un hábito archivado, no solo la frecuencia. Tests en `lib/habits/schedule-overrides.test.ts` y verificado a mano (aceptó un día futuro válido, rechazó uno anterior a la creación).
- [x] 6.6 Chips de hábitos sin horario, programables por arrastre — `components/calendar/unscheduled-habits-row.tsx`, escribe un override del día puntual vía `useSetHabitScheduleOverride`. Verificado a mano contra el Docker local, con toast de confirmación.
- [x] 6.7 Arrastrar sobre espacio vacío pregunta si se crea un evento o una tarea — selección por puntero en `time-grid.tsx` + `components/calendar/create-block-choice-dialog.tsx` (sin default silencioso). Verificado a mano: el rango mostrado coincide con el arrastrado, y "Tarea"/"Evento" no crean nada hasta elegir uno.
- [x] 6.8 Camino alternativo para cada acción (D-G/D24): mover y duración ya existían (`DateSelect`, tareas 4.2-4.5); "programar un hábito" se amplió en `components/habits/habit-card.tsx` (`RescheduleHabitControl`, con selector de día — antes solo ofrecía hoy, lo que habría dejado la reprogramación a otro día disponible solo por arrastre); "crear" se cubre con el alta rápida de tareas y el nuevo `components/calendar/create-event-dialog.tsx` para eventos (respalda también el futuro botón del grupo 7, tarea 7.6). Los cuatro verificados a mano.
- [x] 6.9 Optimistic update al mover, con reversión y aviso si el servidor falla — ya lo tenía `useUpdateTask` (tareas); se agregó a `useSetHabitScheduleOverride`/`useRemoveHabitScheduleOverride` (hábitos), que no lo tenían.
- [x] 6.10 Tests del ajuste a 15 minutos y de la traducción de cada tipo a su mutación — `lib/calendar/drag.test.ts`, `lib/calendar/block-drag-translate.test.ts`, `lib/habits/schedule-overrides.test.ts`.

## 7. Integración *(dueño único de los archivos compartidos)*

- [x] 7.1 `lib/view-options/schema.ts`: sumar `calendario` a `VIEW_SHAPE_OPTIONS` y la opción de formato de calendario — el campo se llama `formato_calendario` (no `calendarFormat`), a propósito: es la misma clave literal que el test de fase 2 usaba como ejemplo de clave desconocida (ver 7.2). **Importante, fuera de esta tarea**: el selector ya ofrece "calendario" y persiste la preferencia, pero nada en `sectioned-tasks.tsx`/`proximos-view.tsx` todavía monta `CalendarView` cuando se elige — verificado a mano, elegir "calendario" hoy cae al render de lista. Ese cableado no está en `tasks.md` (7.1-7.10) ni en el `Impact` de `proposal.md`, así que lo dejé fuera por alcance, pero valdría confirmarlo antes de dar la fase por cerrada.
- [x] 7.2 Revisado: `lib/view-options/schema.test.ts` ahora prueba que `formato_calendario` es una clave válida (nuevo test), y el caso de "clave desconocida se descarta" se reescribió con `orden_experimental` en vez de `formato_calendario`, sin borrar la cobertura del descarte.
- [x] 7.3 Control de repeticiones futuras expuesto en `view-options-bar.tsx`, visible solo con `viewShape === "calendario"` — verificado a mano en el navegador.
- [x] 7.4 Sección Calendarios montada en `settings-modal.tsx` (sexta pestaña); `settings-context.tsx` ahora soporta `open(section?)` para abrir directo en una sección (lo usa el banner de 7.7). Test actualizado a las seis secciones. Verificado a mano contra el Docker local: conexión "Sin conexión con Google" con botón "Conectar con Google", y con checkboxes para elegir qué calendarios se muestran (antes no estaba en `calendars-section.tsx`, lo agregué acá).
- [x] 7.5 El atajo `E` abre `CreateEventDialog` con un rango por defecto (próxima media hora, una hora de duración — `lib/calendar/default-event-range.ts`). Verificado a mano que sigue sin abrirse con el detalle de tarea abierto (la pila de contextos ya lo resolvía, no se tocó).
- [x] 7.6 `components/layout/sidebar-add-event.tsx`, montado junto a "Agregar tarea" en `sidebar-content.tsx` (desktop y hoja de teléfono). Verificado a mano en escritorio y en la hoja de teléfono.
- [x] 7.7 `components/providers/google-reconnect-banner.tsx`, montado en `app/(app)/layout.tsx` junto a `OfflineBanner`. Por D5 usa `--warning`, no `--error`. Verificado con test (`needs_reauth` mockeado) — sin una cuenta de Google real con token vencido, no se pudo forzar el estado en el navegador (depende del grupo 0).
- [x] 7.8 `components/calendar/today-events-block.tsx` + `lib/calendar/use-today-events.ts`, montado en `hoy-view.tsx` entre hábitos y completadas. Degrada con claridad si la conexión está rota o Google no responde (tarea 3.7). Verificado a mano contra el Docker local (sin conexión, el bloque no aparece, como pide el spec).
- [x] 7.9 Sacado "Google Calendar" de `ROADMAP_ITEMS` en `roadmap-section.tsx`. Verificado a mano en la landing.
- [x] 7.10 Botón "Conectar con Google"/"Reconectar" (ancla a `/api/auth/google`) y botón "Desconectar" (`useDisconnectGoogleConnection`, POST a `/api/auth/google/disconnect`) en `calendars-section.tsx`, con el estado siempre visible (conectado/sin conexión/necesita reconectar). Verificado a mano: sin credenciales de Google cargadas (grupo 0 pendiente), el botón navega a `/api/auth/google` y cae al redirect de "no configurado" documentado en esa ruta — no se pudo completar un OAuth real.
- [x] 7.11 El hueco que dejó fuera la tarea 7.1: `CalendarView` no se montaba en ningún lado. Se monta ahora en `SectionedTasks` (Bandeja y Proyecto) y `ProximosView` cuando `options.viewShape === "calendario"` — **no** en Hoy, Etiqueta ni Filtro, mismo criterio que ya usa `modo-panel` (`showViewShape` solo en esas tres pantallas; el propio delta de `opciones-de-vista` de esta fase restringe el selector, calendario incluido, a Bandeja/Proyecto/Próximos). `components/calendar/screen-calendar.tsx` (nuevo) arma los bloques a partir de lo que cada pantalla ya tiene —tareas propias, `useHabits`, eventos por rango (`lib/calendar/use-calendar-range-events.ts`, nuevo)— vía `lib/calendar/screen-blocks.ts` (nuevo, D-F: la grilla sigue sin conocer ningún dominio), y traduce el arrastre con `block-drag-translate.ts` ya existente. Color de tarea: el del proyecto (único en Bandeja/Proyecto, mapa por `project_id` en Próximos); color de hábito: `habit.color` resuelto igual que en `HabitCard`. `now` se resuelve una sola vez después de montar con `useMounted()` (mismo mecanismo que ya evita el problema de tema en `LabelChipView`), nunca con un default. Navegación (`components/calendar/calendar-nav.tsx` + `lib/calendar/navigation.ts`, nuevos) porque `CalendarView` no decide qué rango mostrar. Alta de tarea desde un arrastre sobre espacio vacío: `components/calendar/create-task-from-range-dialog.tsx` (nuevo, mismo patrón mínimo que `CreateEventDialog`). Fuera de alcance, documentado como límite conocido: mover/redimensionar un bloque de **evento** avisa con un toast en vez de mutar — no hay ninguna UI de edición de eventos existentes en el repo todavía para reusar, y no se puede verificar de punta a punta sin credenciales de Google (grupo 0 pendiente); tampoco se implementaron los bloques de vista previa de repeticiones futuras de tareas (tarea 5.7 es de la grilla, no de esta tarea, y proyectar RRULE de tareas es trabajo aparte). Verificado a mano contra el Docker local: tarea con `due_at` y sin fecha, hábito con horario y sin horario (chip arrastrable, con el guard de `assertAppliesOnDate` rechazando/aceptando correctamente), los cuatro formatos, arrastre de creación, arrastre de movimiento (persiste tras recargar), Próximos con selector de proyecto y Proyecto/Bandeja sin él, y sin conexión de Google (no aparece ningún aviso de error, tareas y hábitos se ven igual). En 1400px y en 390px.

**Arreglo de paso, no numerado**: `components/board/board.tsx` tenía el mismo `<DndContext>` sin `id` explícito que el grupo 6 diagnosticó — pero al verificar en el navegador, el warning de `aria-describedby` en `/bandeja` salía en realidad de `components/tasks/task-list.tsx` (el `DndContext` que se usa en modo lista, el default de esa pantalla), no del de `board.tsx` (solo se monta en modo panel). `components/sections/section-list.tsx` tenía el mismo problema. Les puse `id` fijo a los tres (`board-drag`, `task-list-drag`, `section-list-drag`) — `project-tree.tsx` ya tenía el suyo. Confirmado en el navegador: sin el warning en `/bandeja`.

## 8. Verificación de la fase

- [ ] 8.1 `pnpm lint && pnpm typecheck && pnpm test` y `pnpm test:rls` en verde
- [ ] 8.2 Criterio: se conecta una cuenta de Google y los eventos aparecen con su color
- [ ] 8.3 Criterio: un evento editado en Trazio se refleja en Google Calendar, y al revés tras refrescar
- [ ] 8.4 Criterio: mover un bloque en el calendario ajusta a 15 minutos y persiste
- [ ] 8.5 Criterio: al vencer el token aparece el aviso de reconexión y reconectar funciona
- [ ] 8.6 Criterio: las tareas de Trazio **no** se publican en Google — verificar mirando Google, no el código
- [ ] 8.7 Las tres formas de editar una serie recurrente, verificadas **a mano** contra un calendario real
- [ ] 8.8 Recorrido manual de los cuatro formatos, en escritorio y en 390px de ancho
- [ ] 8.9 Verificar que ninguna acción quedó disponible solo por arrastre (D24)
- [ ] 8.10 Verificar que el refresh token está cifrado en la base: mirar la fila, no confiar en el código
- [ ] 8.11 Tests e2e de los flujos nuevos, con la API de Google simulada
- [ ] 8.12 Marcar los criterios de aceptación de la fase 4 en `docs/roadmap.md`
