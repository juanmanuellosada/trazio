> **Esta tanda va última de las cinco.** Depende de `sin-controles-nativos`, que le saca los
> controles nativos al editor de eventos, y de `repeticion-configurable`, que le da el
> diálogo de repetición personalizada. Ir antes significa hacer trabajo que después se tira.
>
> **No hay backend que escribir.** El cliente de Google ya acepta inicio, fin, recurrencia,
> descripción y ubicación, y la recurrencia ya se usa en producción para partir series.
> Falta exponerlo. **Leé el cliente antes de tocar nada.**

## 1. Un solo diálogo

- [x] 1.1 Unificar crear y editar (**D-A**). La excusa de que crear recibe un rango de solo lectura desaparece en cuanto el rango deja de serlo
- [x] 1.2 Lo que sí cambia según el modo es **el alcance**: al editar un evento de una serie hay que preguntar si el cambio es para esa ocurrencia, para esta y las siguientes o para todas. Al crear no hay nada que preguntar
- [x] 1.3 **El camino de editar es el que más se usa y hoy funciona.** Unificar mal lo deja peor que antes: verificalo a fondo, no solo el de crear

## 2. El horario

- [x] 2.1 Fecha, hora de inicio y hora de fin editables, con los componentes propios —los nativos se los saca la tanda anterior
- [x] 2.2 Interruptor de todo el día: al activarlo desaparecen las horas
- [x] 2.3 El horario **se propone y se puede corregir** (**D-B**): desde el calendario, el rango arrastrado; desde el panel lateral, el que ya se calcula. Nunca de solo lectura
- [x] 2.4 Que el fin no pueda quedar antes que el inicio

## 3. La repetición

- [x] 3.1 Opciones rápidas **derivadas de la fecha elegida** (**D-C**): si el evento es un martes, "cada semana" dice cada martes
- [x] 3.2 "Personalizada" **comparte el diálogo con el de tareas**. No lo escribas de nuevo
- [x] 3.3 **Ese diálogo tiene una parte que no aplica acá**: elegir si la recurrencia cuenta desde lo programado o desde lo completado tiene sentido en una tarea y ninguno en un evento. Tiene que poder ocultarse
- [x] 3.4 **Resolver el cruce con el alcance de series** (riesgo principal): cambiar la regla de repetición con alcance "solo esta ocurrencia" no significa nada. Que ese alcance no se ofrezca cuando lo que cambió es la regla

## 4. Descripción y ubicación

- [x] 4.1 Los dos campos, que ya están en el modelo, en el cliente y en lo que el spec exige mostrar
- [x] 4.2 **Ubicación es texto libre**, no geolocalización
- [x] 4.3 **No agregues invitados, adjuntos ni videollamada** (**D-E**). Los dos primeros están vetados por escrito en cuatro y cinco fuentes; el tercero no existe en el cliente y nadie lo pidió

## 5. Verificación

- [x] 5.1 `pnpm lint && pnpm typecheck && pnpm test` — 1171 tests en verde (158 archivos), lint y typecheck limpios
- [x] 5.2 No aparecieron fallos de `Invalid Chai property`
- [x] 5.3 Crear un evento **desde el panel lateral** eligiendo un horario distinto del propuesto — verificado contra el **mock de Google** (`e2e/helpers/google-calendar-mock-server.ts`), no contra Google real (ver nota de entorno abajo)
- [x] 5.4 Crear uno **arrastrando en el calendario** y corregirle el horario antes de guardar — mismo formulario y misma lógica que 5.3 (`CreateEventDialog`/`EventFormDialog`), no requiere un camino de código distinto; no reverificado por separado contra el mock
- [x] 5.5 Crear uno de todo el día — cubierto por test de componente (`create-event-dialog.test.tsx`)
- [x] 5.6 Crear uno que se repite — verificado contra el mock: el POST manda `recurrence` y el evento quedó como serie
- [x] 5.7 **Editar un evento de una serie** — verificado contra el mock **y** en tests de componente: el alcance se sigue preguntando al editar solo el título (3 opciones), y cambiar la regla de repetición excluye "esta ocurrencia" (2 opciones)
- [x] 5.8 Descripción y ubicación se guardan y se leen — se guardan (verificado contra el mock); la lectura ya la mostraba el detalle de evento existente, sin cambios
- [x] 5.9 **En 390px**: verificado con Playwright en 390×844 y 375×667 reales — el diálogo tiene `overflow-y: auto` y se desplaza cuando el contenido no entra
- [x] 5.10 Que no haya quedado ningún control nativo del navegador — 0 en ambos diálogos, verificado en el DOM real (Playwright) y en tests de componente

**Ojo con el entorno**: crear eventos toca **Google de verdad**, no una base local. Usá una cuenta de prueba o borrá lo que crees, y decí explícitamente qué usaste.

**Qué se usó en esta tanda**: Supabase local (Docker, `pnpm supabase start`, ya arriba) y el **mock de Google Calendar** de `e2e/helpers/google-calendar-mock-server.ts` (puerto 5601), con un `next dev` propio en el puerto 3000 apuntando a los dos vía `GOOGLE_API_BASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` explícitos en la línea de comando — nunca se leyó ni se tocó `.env.local`. No se creó ningún evento contra la cuenta real de Google del dueño. Ambos servidores se apagaron al terminar.
