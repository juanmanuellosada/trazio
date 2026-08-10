## Why

`carga-del-dia` ya suma lo planificado del día ("5h 20m planificadas"), pero
a propósito no dice si eso entra en el día o no — el número no juzga (D-D
del cambio original). El problema es que un número que no compara contra
nada tampoco informa nada útil: nadie sabe, mirándolo, si le sobra el día o
si ya lo tiene lleno. Para saberlo hace falta restar contra algo, y esa
resta es justo el dato que se dejó afuera.

Al mismo tiempo, el dato ya está: cada tarea y cada hábito con hora ocupa un
lugar concreto en el calendario, y el calendario de Google conectado se lee
en cada consulta. Con eso alcanza para responder dos preguntas que hoy nadie
contesta: cuánto tiempo libre queda en el día, y qué hacer con el próximo
hueco libre.

## What Changes

- El encabezado de Hoy SHALL dejar de mostrar "Xh Ym planificadas" y SHALL
  mostrar, en su lugar, el tiempo libre que queda entre ahora y la hora de
  fin del día, y cuánto de lo pendiente todavía no tiene un lugar asignado
  en el calendario: "Te quedan 3h 40m libres y 2h 15m de tareas sin
  agendar".
- SHALL avisar, en el mismo encabezado, cuando lo que falta agendar no
  entra en el tiempo libre que queda.
- Se agrega la preferencia **hora en que termina el día**, en Configuración
  → General, con 22:00 de default.
- Se agrega la acción **"¿Qué hago ahora?"**: mira el hueco entre ahora y
  el próximo bloque agendado (evento, tarea u hábito con hora) y propone
  una sola tarea que entre ahí, por duración (requisito duro), atraso,
  cercanía de la fecha límite y prioridad, en ese orden. Si no hay hueco,
  SHALL decir hasta qué hora está ocupado. Si hay hueco pero ninguna tarea
  entra, SHALL decirlo también.
- **El número sigue sin juzgar a la persona** (D61): no hay color de
  alerta, no hay tratamiento visual de alarma, no hay puntaje ni
  comparación con otros días. Lo nuevo es la resta contra el tiempo
  disponible — es aritmética sobre datos que la persona cargó, no una
  opinión sobre ella.
- **No se modela horario laboral ni franjas de disponibilidad** (D61,
  rechazado explícitamente). El calendario sigue siendo la única fuente de
  verdad sobre qué ocupa el día.

## Capabilities

### New Capabilities

- `que-hago-ahora`: la acción que mira el próximo hueco libre y propone una
  tarea, con su criterio de selección y sus casos sin hueco o sin
  candidata.

### Modified Capabilities

- `carga-del-dia`: el encabezado de Hoy pasa de sumar un total a comparar
  contra el tiempo libre real; se agrega la separación entre lo comprometido
  (con hora) y lo pedido sin lugar (sin hora).
- `configuracion`: nueva preferencia, hora en que termina el día.
- `esquema-datos`: nueva columna en `user_preferences`.
- `atajos-de-teclado`: nuevo atajo para "¿Qué hago ahora?".

## Impact

**Lógica** — una primitiva nueva, compartida por las dos piezas: dado el
conjunto de bloques ocupados del día (eventos con horario + tareas y
hábitos con hora) y la ventana entre ahora y la hora de fin, calcula los
huecos libres que quedan. La carga del día suma esos huecos; "¿Qué hago
ahora?" toma el primero.

**Datos** — una migración: `user_preferences.day_end_time`, `time not null
default '22:00:00'`. Sin tabla nueva, sin cambio en `tasks` ni `habits` (la
duración y la hora ya existen en ambas).

**Interfaz** — encabezado de `components/tasks/hoy-view.tsx`, y la sección
General del modal de configuración.

**Fuera de alcance:**

- **Auto-agendar.** La app nunca coloca una tarea en un hueco por su cuenta;
  "¿Qué hago ahora?" propone, la persona decide y agenda a mano si quiere.
- **Estimado vs. real.** No se mide cuánto tardó una tarea contra su
  duración estimada; el tiempo libre sigue confiando en la estimación tal
  como está cargada.
- **Horario laboral y franjas de disponibilidad.** Rechazado explícitamente
  en D61: el calendario es la única fuente de ocupación.
- **Puntajes, rachas o estadísticas de productividad.** No hay ninguna
  medida de qué tan bien o mal se usó el tiempo libre, ni acá ni en ningún
  otro lado de la app.
- **Bloquear o impedir agendar algo que no entra.** El aviso de que lo
  pedido no entra es informativo; agendar igual sigue estando permitido y
  no pide confirmación.
