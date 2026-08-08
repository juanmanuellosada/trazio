## Context

La cañería de push ya existe y funciona de punta a punta para tareas:

- `reminders` guarda una fila por recordatorio, con `remind_at` absoluto,
  `offset_minutes` (null = puntual) y `delivered_at`.
- `claim_due_reminders(p_limit)` reclama en una sola sentencia atómica
  (`update … where id in (… for update skip locked) returning`), y recién
  ahí la edge function envía. Ese orden es lo que garantiza la entrega única
  de D7.
- `pg_cron` invoca `enviar-recordatorios` cada minuto vía `pg_net`.
- `public/sw.js` recibe `{ title, taskId }` y navega a `/tarea/<id>`.

Un hábito no encaja en esa forma por una razón estructural: **una tarea es
una fila, un hábito es una regla**. La tarea tiene un `due_at` concreto sobre
el que se puede calcular un `remind_at` y guardarlo. El hábito no tiene filas
por día — `habits` guarda la frecuencia (`daily`, `times_per_week`,
`specific_days`), una `scheduled_time` local opcional, y las excepciones
viven en tres tablas laterales (`habit_completions`,
`habit_schedule_overrides`, `habit_skips`). "Qué hábitos tocan hoy" se
resuelve hoy en TypeScript, en `lib/habits/today.ts` y
`lib/habits/pending-today.ts`, cada vez que se pinta la pantalla.

La restricción de fondo del diseño es esa: hay que producir instantes de
envío a partir de una regla, y las excepciones que la modifican pueden
aparecer en cualquier momento —incluso un minuto antes del aviso.

## Goals / Non-Goals

**Goals:**

- Que un hábito pueda tener varios recordatorios push relativos a su hora.
- Que el aviso refleje el estado del hábito **en el momento de enviarlo**:
  una reprogramación de hoy lo corre, un salteo o una marca lo cancelan.
- Conservar la entrega única de D7 con la misma garantía que las tareas: una
  única sentencia atómica que reclama antes de enviar.
- Reusar la edge function, el `pg_cron`, las suscripciones y el service
  worker que ya existen, sin duplicar infraestructura.

**Non-Goals:**

- Recordatorio puntual absoluto sobre un hábito (decisión del dueño).
- Recordatorios sobre hábitos archivados.
- Cambiar el comportamiento de los recordatorios de tareas.
- Recordatorios por email (D7).
- Notificar el progreso semanal de un `times_per_week` ("te faltan 2 esta
  semana"): el aviso es por ocurrencia, no un resumen.

## Decisions

### D-A — La ocurrencia se evalúa al enviar, no se materializa por adelantado

**Decisión:** no se generan filas de recordatorio futuras. El cron, cada
minuto, evalúa qué hábitos tienen un aviso vencido *en ese instante*, contra
el estado actual de `habits`, `habit_schedule_overrides`, `habit_skips` y
`habit_completions`.

**Alternativa considerada — materializar:** un generador diario que escribe
en `reminders` (o en una tabla propia) las ocurrencias de los próximos N
días, y el cron existente las levanta sin cambios. Es lo que más código
reusa y por eso fue la primera opción.

**Por qué se descarta:** materializar convierte cada excepción en una
invalidación. Saltear un hábito, marcarlo, reprogramarlo, archivarlo,
editarle la frecuencia, editarle la hora o cambiar la zona horaria de la
cuenta pasan a exigir, cada uno, un trigger que reescriba las filas ya
generadas. Son seis o siete caminos de invalidación, y **el que se olvide se
manifiesta como una notificación de un hábito que ya hiciste** — el peor modo
de falla posible para esta función, porque enseña a ignorar los avisos.
Evaluar al enviar no tiene ninguno de esos caminos: la consulta lee el estado
de ese momento y ya.

**Lo que cuesta:** una consulta más cara por minuto (un join sobre hábitos
activos con recordatorios, acotado por índice) y la regla de "pendiente"
escrita en SQL además de en TypeScript (ver D-G).

### D-B — Entrega única por `insert … on conflict do nothing returning`

Las tareas garantizan la entrega única marcando `delivered_at` sobre una fila
que ya existe. Un hábito no tiene esa fila, así que la garantía se invierte:
**la fila se crea al reclamar**, y la clave primaria es la que impide el
duplicado.

```
habit_reminder_deliveries (habit_id, date, offset_minutes) -- PK compuesta
```

El reclamo es una única sentencia:

```sql
insert into public.habit_reminder_deliveries (habit_id, user_id, date, offset_minutes, delivered_at)
select … from (/* ocurrencias vencidas */) as due
on conflict (habit_id, date, offset_minutes) do nothing
returning …
```

`insert … on conflict do nothing returning` devuelve **solo las filas que
efectivamente insertó**. Dos ejecuciones solapadas del cron: la primera
inserta y recibe la fila, la segunda choca contra la PK y recibe cero filas.
Es la misma propiedad que da `for update skip locked` en
`claim_due_reminders`, obtenida por la clave en vez de por el bloqueo, y
sigue siendo una sola sentencia atómica — el orden reclamar-antes-de-enviar
de D7 se conserva intacto.

`date` es la fecha **local** del usuario, no UTC: es lo que hace que "el
aviso de las 7:00 del martes" sea una cosa sola aunque el usuario cambie de
zona horaria.

### D-C — La regla vive en `habit_reminders`, no en `reminders`

`reminders.task_id` es `not null` y referencia `tasks`. Colgar hábitos de esa
tabla obliga a aflojar esa restricción a "una de las dos, y exactamente una",
que es un check constraint que hay que sostener a mano, y a que todo lo que
hoy lee `reminders` empiece a filtrar por tipo. Una tabla propia de dos
columnas útiles (`habit_id`, `offset_minutes`) es más chica que ese remiendo:

```
habit_reminders (id, user_id, habit_id, offset_minutes)  -- unique (habit_id, offset_minutes)
```

El `unique` evita el aviso duplicado por configuración —agregar dos veces
"30 minutos antes"— sin necesidad de validarlo en la interfaz. `user_id`
propio, no derivado por join, siguiendo D11. `on delete cascade` desde
`habits` en las dos tablas: borrar un hábito se lleva sus reglas y su
historial de entregas.

### D-D — Ventana de gracia de 15 minutos, y nada más viejo se envía

Para tareas, la condición es `remind_at <= now()` sin cota inferior: un
recordatorio de hace tres días se dispara apenas el cron vuelve. Copiar eso
acá sería grave: la primera corrida después del despliegue encontraría
*todas* las ocurrencias pasadas de todos los hábitos y las enviaría juntas.

La condición para hábitos lleva las dos cotas:

```sql
where momento <= now() and momento > now() - interval '15 minutes'
```

Quince minutos porque el cron corre cada minuto: tolera una caída real del
cron o de la edge function sin perder el aviso, y un aviso quince minutos
tarde todavía sirve. Más viejo que eso se descarta en silencio, que es
exactamente lo que D7 ya manda para las tareas ("si no llegó a tiempo, no se
reintenta").

**Consecuencia aceptada:** una caída de más de quince minutos pierde los
avisos de esa ventana. Es preferible a la alternativa —una andanada de
notificaciones viejas— y coherente con la regla de entrega única.

### D-E — El instante se arma en la zona horaria del usuario

`habits.scheduled_time` es un `time` sin zona, y las tres tablas laterales
usan `date`. El instante absoluto se arma así:

```
fecha_local  = (now() at time zone up.timezone)::date
hora_efectiva = coalesce(override.scheduled_time, h.scheduled_time, up.reference_time)
momento      = ((fecha_local + hora_efectiva) at time zone up.timezone) + make_interval(mins => hr.offset_minutes)
```

Tres cosas de esa expresión:

- `coalesce` implementa la prioridad completa en un solo lugar: override del
  día → hora habitual → **hora de referencia** para el hábito "todo el día".
  Es la misma hora de referencia que ya usan las tareas sin hora
  (`user_preferences.reference_time`, migración `20260802030000`), así que la
  cuenta no gana una preferencia nueva.
- `fecha_local` sale de la zona del usuario, no del servidor: sin eso, un
  hábito de las 23:30 en Buenos Aires se evaluaría contra el día equivocado.
- Cambiar la zona horaria de la cuenta corre los avisos futuros sin migrar
  nada, porque el instante se calcula recién al enviarlo. Es un beneficio
  directo de D-A.

### D-F — No se avisa lo que no está pendiente, y "pendiente" es lo que ya significa hoy

La ocurrencia se descarta si el hábito, ese día: está archivado, es anterior
a su `created_at` en la zona del usuario, no toca por su frecuencia, ya tiene
fila en `habit_completions`, o ya tiene fila en `habit_skips`.

Eso es, término por término, `isHabitPendingToday` de
`lib/habits/pending-today.ts` más el salteo. En particular, un
`times_per_week` **avisa todos los días hasta que se marque**, porque
`habitAppliesOnDate` ya lo trata como que toca cualquier día y la pantalla de
Hoy lo muestra así: el recordatorio no inventa una noción de "pendiente"
distinta de la que la persona ya ve.

La marca y el salteo se consultan en el momento del envío, así que completar
un hábito a las 6:55 cancela el aviso de las 7:00 sin que nada tenga que
invalidarse.

### D-G — La regla queda escrita dos veces, y eso se sostiene con tests

`lib/habits/today.ts` decide en TypeScript qué hábitos se pintan; la función
de reclamo decide en SQL cuáles se avisan. Son dos expresiones de la misma
regla en dos lenguajes, y no hay forma razonable de unificarlas: la pantalla
no puede llamar a la base por cada render, y el cron no puede correr
TypeScript del cliente.

**Mitigación:** una batería de tests de RLS/SQL (`vitest.rls.config.ts`, que
ya existe) que corre los mismos casos borde contra la función —hábito creado
a mitad de semana, `specific_days` en un día que no toca, salteado,
completado, archivado, override que corre la hora, cruce de medianoche en una
zona con desfase— y un comentario en cada lado apuntando al otro. Si las dos
se separan, se separan con un test en rojo.

### D-H — Un solo reclamo más en la misma edge function, y un payload discriminado

`enviar-recordatorios` suma una segunda llamada `rpc` —
`claim_due_habit_reminders` — junto a la que ya hace, y unifica los dos
resultados antes de repartir a las suscripciones. La agrupación por usuario,
el manejo de 404/410 y el borrado de suscripciones inválidas se reusan tal
cual.

El payload pasa a llevar el destino resuelto en vez de un id suelto:

```
{ title, url }   // "/tarea/<id>" o "/habitos"
```

`public/sw.js` navega a `payload.url`. Se mantiene la lectura de `taskId` como
respaldo para las suscripciones que todavía tengan el service worker viejo en
memoria: un service worker se actualiza cuando el navegador quiere, así que
durante un rato conviven las dos versiones y un payload nuevo contra un worker
viejo abriría la raíz en vez de la tarea.

### D-I — Fuera de realtime, y purga de entregas

`habit_reminder_deliveries` no entra en la publicación de realtime: ninguna
interfaz se suscribe: mismo criterio que `habit_schedule_overrides` y
`habit_skips`. `habit_reminders` sí, para que editar los recordatorios de un
hábito en una pestaña se vea en la otra, coherente con el resto de la app.

La tabla de entregas crece una fila por hábito, día y desfase. Con veinte
hábitos y dos recordatorios cada uno son ~15.000 filas al año: irrelevante en
tamaño, pero no hay motivo para conservarlas más allá de la ventana de gracia.
La función de reclamo borra, en la misma corrida, lo anterior a 7 días.

## Risks / Trade-offs

**[La consulta del cron corre cada minuto sobre hábitos activos]** → El
volumen real es chico (hábitos por cuenta, no tareas), pero la consulta hace
join con cuatro tablas. Mitigación: índice parcial sobre `habit_reminders`
por `habit_id`, y el filtro por `h.is_archived = false` primero. Medir con
datos sembrados antes de dar por buena la ventana de 15 minutos; si la
consulta no entra cómoda en el minuto, acotar por lote como ya hace
`claim_due_reminders(p_limit)`.

**[La regla de "pendiente" duplicada en TS y SQL se separa]** → D-G: tests de
casos borde contra la función SQL, y comentarios cruzados.

**[Una caída de más de 15 minutos pierde avisos]** → Aceptado y explícito
(D-D). La alternativa es peor.

**[`times_per_week` avisa todos los días y puede sentirse ruidoso]** → Es
consistente con lo que Hoy ya muestra, así que no sorprende. Si molesta, la
salida no es cambiar la regla del recordatorio sino la de "pendiente", y eso
sería otra propuesta que toca también la pantalla de Hoy.

**[Un service worker viejo con un payload nuevo]** → D-H: se manda `url` y se
conserva `taskId`, y el worker nuevo lee los dos.

**[El aviso de un hábito "todo el día" cae en la hora de referencia y puede
no ser obvio]** → La interfaz lo dice en el propio selector: cuando el hábito
no tiene hora, el texto de la opción nombra la hora de referencia en vez de
un genérico "antes".

## Migration Plan

1. Migración con las dos tablas, su RLS en el mismo archivo (regla del
   proyecto), índices y la función `claim_due_habit_reminders`.
2. `pnpm db:types`.
3. Edge function y service worker. El `pg_cron` no se toca.
4. Interfaz del formulario de hábito.

Nada de esto rompe lo existente: hasta que alguien cree su primer
`habit_reminders`, la función nueva devuelve cero filas en cada corrida.

**Rollback:** borrar las filas de `habit_reminders` deja el sistema inerte sin
revertir la migración. `git push` no despliega la base ni la edge function:
la migración va con `supabase db push` y la función con `supabase functions
deploy enviar-recordatorios`, en ese orden.

## Open Questions

- La ventana de gracia de 15 minutos (D-D) es un número elegido, no medido.
  Revisarlo después de la primera semana en producción con un dispositivo
  real, junto con la verificación pendiente de la fase 2 (el criterio de
  aceptación de recordatorios que sigue sin probarse en producción).
