## Context

`carga-del-dia` (`lib/planning/day-load.ts`, `components/calendar/use-day-load.ts`)
ya suma la duración de tareas pendientes con hora o sin hora, hábitos
pendientes y eventos con horario, y lo muestra como un total mudo. Ese total
sigue existiendo tal cual para Próximos (`vista-proximos`, no tocado por
este cambio: un día futuro no tiene un "ahora" del que restar, así que
"cuánto suma ese día" sigue siendo la pregunta correcta ahí). Lo que cambia
es **Hoy**: en vez de sumar todo el día, hoy hace falta saber cuánto de eso
ya pasó, cuánto queda por delante, y si lo que falta entra en lo que queda.

`components/tasks/` tiene prohibido importar de `lib/calendar/` (test que
escanea la carpeta), así que cualquier cálculo que mezcle tareas y hábitos
con eventos de Google sigue teniendo que vivir del lado de
`components/calendar/`, como ya hace `use-hoy-events.ts` y
`use-day-load.ts`.

## Goals / Non-Goals

**Goals:**

- Que el número de Hoy diga algo accionable: cuánto tiempo libre queda, y
  cuánto de lo pendiente todavía no tiene lugar.
- Una sola acción que responda "¿y ahora?" mirando el próximo hueco real.
- Las dos features comparten el mismo cálculo de huecos libres — no hay dos
  formas distintas de calcular "tiempo libre" en la misma pantalla.
- El sistema entero sigue funcionando con la información que haya: sin
  Google conectado, sin tareas con duración, con el día ya terminado.

**Non-Goals** (ver también "Fuera de alcance" en `proposal.md`):

- Horario laboral, franjas de disponibilidad, capacidad configurable por
  persona — rechazado en D61, ver más abajo.
- Auto-agendar: "¿Qué hago ahora?" propone, nunca coloca.
- Comparar estimado contra real.
- Cualquier forma de puntaje, racha o estadística sobre cómo se usó el
  tiempo libre.
- Tocar `vista-proximos`: el total de un día futuro no cambia.

## Decisions

### D-A — El modelo de tiempo (D61)

Repetido acá porque es la base de todo lo demás, tal como quedó fijado en
`docs/decisions.md` D61:

- **El calendario es la única fuente de verdad sobre ocupación.** Lo que
  está agendado ocupa; lo que no, no.
- **Tiempo comprometido** = eventos de Google Calendar con horario + tareas
  y hábitos que tienen una hora asignada (`due_at`, o `scheduled_time`
  efectivo de un hábito).
- **Pedido sin lugar** = tareas y hábitos pendientes con
  `duration_minutes` pero sin hora (`due_date` sin `due_at`, o hábito con
  `scheduled_time` nulo).
- **Tiempo libre** = lo que queda del día (desde ahora hasta la hora de
  fin) menos lo comprometido en esa ventana.
- Una sola preferencia nueva: la hora de fin del día (D-C).

**Por qué no horario laboral ni franjas de disponibilidad.** Se evaluó y se
rechazó de forma explícita, no por omisión. El dueño de Trazio usa la app
para todo, personal y laboral mezclado en el mismo calendario: tiene tareas
agendadas a las 12:15 y a las 13:00, adentro de su propia jornada. Una
franja de "horario laboral" (por ejemplo, "9 a 18") no describiría ese uso,
lo falsearía: marcaría como "fuera de horario" un bloque de las 20:00 que sí
existe y sí ocupa, y como "disponible" una franja de las 11:00 que en
realidad está copada por una reunión que la persona nunca se molestó en
cargar. Cualquier noción de "capacidad" distinta de "lo que dice el
calendario" es una ficción que **el propio dato ya contradice**. Este
rechazo queda documentado para que nadie lo vuelva a proponer sin pasar por
D61 de nuevo.

**Limitación aceptada.** El número vale lo que valga el calendario del
usuario: si copia algunas reuniones y no otras, el tiempo libre se
sobrestima. Se acepta porque el error es visible y se autocorrige — la
persona ve "3h libres" un día que sabe que está tapado, agrega el bloque que
faltaba, y el número siguiente acierta. Es el mismo trato que ya existe en
toda la app entre "el dato es tan bueno como lo que cargaste" y "el dato es
exacto porque lo medimos nosotros" (por ejemplo, la duración estimada de una
tarea nunca se contrasta con cuánto tardó en realidad).

### D-B — Una primitiva compartida: huecos libres, no un total

La versión anterior de `carga-del-dia` sumaba **duraciones** (`lib/planning/day-load.ts`,
`computeDayLoad`): recibía una lista de `{ durationMinutes }` y devolvía un
número. Alcanzaba porque no había que saber *cuándo* pasaba cada cosa, solo
*cuánto*.

Esto ya no alcanza. Tiempo libre necesita saber si un bloque ya pasó, si
está en curso, o si todavía no llegó, porque solo lo que queda por delante
de "ahora" resta tiempo libre. Y "¿Qué hago ahora?" necesita algo que un
total nunca tuvo: **dónde** está el próximo hueco, no solo cuántos minutos
libres hay en total.

La primitiva nueva recibe intervalos, no duraciones:

```
computeFreeGaps({ now, dayEnd, busyBlocks: { start, end }[] }): { start, end }[]
```

Fusiona los bloques ocupados que se superponen, los recorta contra la
ventana `[now, dayEnd]` (un bloque que ya terminó desaparece; uno en curso
queda recortado a lo que falta), y devuelve la lista de huecos entre ellos,
ordenada de más próximo a más lejano.

Las dos piezas consumen la misma lista de huecos, cada una a su manera:

- **Carga del día** (`carga-del-dia`) suma la duración de **todos** los
  huecos: eso es el tiempo libre del día.
- **"¿Qué hago ahora?"** (`que-hago-ahora`) toma **solo el primero**: el
  hueco entre ahora y el próximo bloque agendado.

`busyBlocks` sigue viniendo de tres fuentes (igual que antes): eventos con
horario del calendario conectado, tareas con `due_at` de hoy, y hábitos con
`scheduled_time` efectivo de hoy. El "pedido sin lugar" (duración de lo que
no tiene hora) se calcula aparte, con la suma simple que `computeDayLoad` ya
resolvía — ese cálculo no cambia, solo deja de ser lo único que se muestra.

**Dónde vive.** `lib/planning/free-gaps.ts` para el cálculo puro (recibe
intervalos ya resueltos, sin conocer tareas ni hábitos ni eventos — mismo
principio que ya usaba `day-load.ts`). El llamador que sí conoce las tres
fuentes y arma los `busyBlocks` es `components/calendar/`, hermano de
`use-hoy-events.ts` y `use-day-load.ts` — nunca `components/tasks/`, por la
prohibición ya existente.

### D-C — Dónde vive la hora de fin del día

**Recomendación: columna nueva en `user_preferences`, `day_end_time time
not null default '22:00:00'`.** Mismo patrón exacto que
`user_preferences.reference_time` (`time not null default '09:00:00'`,
migración `20260802030000_user_preferences_reference_time.sql`): una
preferencia global de la cuenta, sin zona horaria propia (se combina con
`user_preferences.timezone` al calcular), editable en Configuración.

**Por qué no es lo mismo que `reference_time`.** Son cosas distintas y no
hay que confundirlas ni reusar una por la otra:

- `reference_time` es la hora a la que se considera que **vence** una tarea
  o hábito que tiene día pero no hora — se usa para calcular recordatorios
  relativos (`claim_due_reminders`, `claim_due_habit_reminders`). Es sobre
  el pasado/presente de un vencimiento puntual.
- `day_end_time` es la hora en la que **termina la jornada** a los efectos
  de cuánto tiempo libre queda — se usa para el límite superior de la
  ventana `[now, dayEnd]`. Es sobre el futuro del día completo.

Nada impide que sean iguales para una persona en particular (alguien podría
tener las dos en 22:00), pero conceptualmente responden preguntas distintas
y una tabla no debería fusionarlas: cambiar una no debe cambiar la otra.

**Alternativas descartadas:**

- **Reusar `reference_time`.** Descartado arriba: significan cosas
  distintas: cambiar la hora en que "se considera vencida" una tarea sin
  hora movería, como efecto secundario no pedido, hasta qué hora se
  considera libre el día.
- **Una constante fija en el código (22:00, sin preferencia editable).**
  Descartado porque el enunciado del feature pide explícitamente que sea
  editable en Configuración — la vida de cada usuario no termina a la misma
  hora.
- **`view_preferences`.** Esa tabla guarda opciones *de una pantalla*
  (agrupador, orden, filtros), con clave compuesta `(user_id, view_key)`.
  La hora de fin del día no es una opción de Hoy — es una preferencia de la
  cuenta, igual que la zona horaria o el formato de hora, y esas ya viven
  en `user_preferences`.

### D-D — Criterio de selección de "¿Qué hago ahora?"

El pool de candidatas son las tareas del **pedido sin lugar de Hoy**: las
mismas que ya cuenta `carga-del-dia` como "sin agendar" (pendientes, con
`duration_minutes`, sin `due_at`, que vencen hoy o están atrasadas). Mismo
principio que ya rige en `carga-del-dia` para el total de una pantalla ("El
total de una pantalla SHALL sumar únicamente lo que esa pantalla muestra"):
la sugerencia de Hoy solo propone lo que Hoy ya le está mostrando a la
persona, nunca algo que saldría de la nada.

**Solo tareas, no hábitos.** El enunciado del feature pide "considerando
duración, prioridad y cercanía del `deadline`" — prioridad y `deadline` son
campos de `tasks`, `habits` no los tiene. Proponer un hábito exigiría
inventar un criterio de prioridad que hoy no existe en el dato, así que
queda afuera: si más adelante se quiere, es una decisión aparte con su
propio criterio.

**Orden, de más duro a más blando:**

1. **Duración ≤ tamaño del hueco.** Requisito duro, no un criterio de
   orden: una tarea que no entra no es candidata, ni siquiera como última
   opción.
2. **Atrasada primero.** Mismo criterio que ya usa el bloque de atrasadas
   de Hoy (la más vencida primero): es lo más urgente que hay en la
   pantalla, y "¿qué hago ahora?" existe justamente para esos momentos
   donde conviene indicar qué hacer.
3. **Fecha límite (`deadline`) más próxima.** Un `deadline` es un tope
   real, puesto por algo externo a la persona (una entrega, un trámite). Va
   antes que la prioridad porque la prioridad es una opinión editable de la
   propia persona sobre sí misma — más blanda que un tope externo.
4. **Prioridad** (Urgente > Alta > Media > Baja), para desempatar entre
   tareas sin `deadline`, o con `deadline` igual de próximo.
5. **`position`** (el orden manual que la persona ya le dio a sus tareas),
   como desempate final: determinista, nunca aleatorio, y respeta el mismo
   orden que la persona ve en cualquier otra lista.

Una tarea sin duración estimada **nunca** es candidata (paso 1: no hay con
qué medir si entra). No se avisa aparte por esto — ya está cubierto por el
indicador general de "sin duración" que `carga-del-dia` muestra.

### D-E — Casos borde

| Caso | Comportamiento |
| --- | --- |
| Sin calendario de Google conectado | Las dos piezas funcionan igual, con lo que hay: `busyBlocks` sale solo de tareas y hábitos con hora. Mismo principio que D-D del `carga-del-dia` original: sin conexión no se anuncia que faltan eventos. |
| Google caído | Igual que sin conectar: se calcula con lo disponible, sin error ni hueco. |
| Sin ninguna tarea con duración | Carga del día: no se muestra la cláusula "sin agendar" (mismo principio que "todo con duración no muestra el aparte", aplicado al revés — acá es "nada pedido sin lugar" en vez de "nada sin medir"). "¿Qué hago ahora?": no hay candidata; el aviso es "no tenés ninguna tarea que entre en este hueco", distinto del aviso de "no hay hueco". |
| Día ya terminado (después de la hora de fin) | El tiempo libre se **clampea a cero**, nunca negativo. El encabezado dice que el día terminó, no "0m libres" (mismo espíritu que "nunca 0m planificadas cuando nada tiene duración": un cero sin contexto se lee como error). "¿Qué hago ahora?" tampoco busca hueco: mismo mensaje de día terminado. |
| Hueco de menos de 5 minutos | Se trata como "no hay hueco": el primer elemento de `computeFreeGaps` se descarta si dura menos de 5 minutos, y "¿Qué hago ahora?" muestra el mensaje de ocupado hasta la hora del próximo bloque. Cinco minutos es un número **elegido, no medido** — no alcanza para empezar nada con sentido, ni para el cambio de contexto. Como el margen de gracia de D58, es candidato a revisarse con uso real. |
| Tareas sin duración estimada | Nunca son candidatas de "¿Qué hago ahora?" (D-D, paso 1). Sí siguen contando en el indicador general de "sin duración" de `carga-del-dia`, sin cambios. |

### D-F — Botón y atajo, sin paleta de comandos

Trazio no tiene paleta de comandos (no existe esa capacidad en el spec ni en
el código): ofrecerla ahí implicaría construir una superficie nueva entera
solo para esta acción, desproporcionado para lo que pide el feature.

**Recomendación: botón en el encabezado de Hoy, junto al tiempo libre, más
un atajo de teclado.** El botón es la vía descubrible — aparece en el mismo
lugar donde ya está el dato que lo motiva ("te quedan 3h 40m libres" y, al
lado, "¿Qué hago ahora?"). El atajo es consistente con que Trazio ya trata
sus acciones más usadas como atajos de una sola tecla (`Q` alta rápida, `S`
buscador): esta es exactamente ese tipo de acción, algo que tiene sentido
disparar varias veces por día sin soltar el teclado.

La tecla exacta **no se fija en esta propuesta**: como ya hizo
`G llega también a Filtros` (`atajos-de-teclado`), la tecla se verifica
contra los atajos existentes en el momento de implementar, nunca se supone
libre. Como referencia, al día de esta propuesta las letras sueltas
reservadas como destino de acorde `G` (`I`, `H`, `P`, `C`, `A`, `F`) no
están registradas como atajo directo fuera del acorde, así que son
candidatas a revisar primero.

Al ser un botón con atajo, `indicadores-de-atajo` ya lo cubre sin cambios:
su primer requisito ("cualquier botón que tenga un atajo de teclado
asociado SHALL mostrar el indicador de ese atajo") aplica tal cual, sin
necesidad de un delta en esa capacidad.

## Risks / Trade-offs

**[El tiempo libre puede sobrestimarse si el calendario está incompleto]**
→ D-A: aceptado y documentado en D61, con el mecanismo de autocorrección
(la persona ve el error, carga lo que falta, el número siguiente acierta).

**[Cinco minutos como piso del hueco es arbitrario]** → D-E: elegido, no
medido, mismo espíritu que D58. Revisar con uso real.

**[La sugerencia de "¿Qué hago ahora?" puede repetir la misma tarea todo el
día si nadie la agenda]** → Es el comportamiento correcto, no un bug: si la
tarea más urgente que entra en el hueco sigue siendo la misma tarea, seguir
sugiriéndola es lo honesto. La alternativa (rotar sugerencias para variar)
inventaría una noción de "ya te lo dije" que no tiene sustento en el
criterio de selección.

**[El atajo elegido puede colisionar con uno ya registrado]** → D-F: se
verifica en el momento de implementar, con el mismo procedimiento que ya
usó `G` + Filtros.
