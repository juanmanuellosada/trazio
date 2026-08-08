## Context

Los tres ingredientes ya existen y viven en tres lugares distintos:

- `tasks.duration_minutes` (nullable) y las tareas de Hoy en
  `lib/tasks/use-hoy-tasks.ts`.
- `habits.duration_minutes` (**not null**) y los hábitos que tocan hoy en
  `lib/habits/today.ts`, con `pending-today.ts` definiendo "pendiente".
- Los eventos del Google Calendar conectado, en `lib/calendar/`, expuestos a
  Hoy a través de `components/calendar/use-hoy-events.ts`.

Esa última separación no es casual y condiciona el diseño: **`components/tasks/`
tiene prohibido importar de `lib/calendar/`**, y un test lo verifica escaneando
la carpeta (`lib/calendar/tasks-and-habits-never-publish-to-google.test.ts`).
`use-hoy-events.ts` existe justamente como el único puente. Cualquier cálculo
que mezcle tareas con eventos y viva en `components/tasks/` rompe ese test.

## Goals / Non-Goals

**Goals:**

- Un número por día, honesto sobre lo que no pudo sumar.
- Que funcione con el calendario desconectado, cargando o caído.
- Cálculo puro y testeable, sin acceso a datos adentro.

**Non-Goals:**

- Comparar contra el tiempo libre, contra una capacidad configurable, o
  avisar de sobrecarga. Decisión del dueño: el número no juzga.
- Auto-agendar, sugerir mover tareas, o cualquier forma de planificación
  automática.
- El total en la vista de panel: una columna de panel agrupa por sección o
  prioridad, no por día — el número no significaría nada ahí.
- Sumar en la vista de calendario: la grilla ya muestra la carga
  visualmente, que es más elocuente que el número.

## Decisions

### D-A — Un cálculo puro que recibe duraciones, no entidades

`lib/planning/day-load.ts` expone algo del orden de:

```ts
type DayLoadInput = { durationMinutes: number | null }[]
computeDayLoad(items: DayLoadInput): { totalMinutes: number; withoutDuration: number }
```

No conoce tareas, ni hábitos, ni eventos: recibe una lista de duraciones ya
resueltas por el llamador. Dos razones:

1. Es la única forma de que Hoy sume eventos sin que `components/tasks/`
   toque `lib/calendar/`. El llamador que sí conoce las tres fuentes es
   `components/calendar/use-day-load.ts`, hermano de `use-hoy-events.ts`.
2. El caso borde real de esta función no son las entidades, son los nulos.
   Un cálculo puro sobre duraciones se testea exhaustivamente en cuatro
   líneas.

**Alternativa considerada:** una función por tipo de entidad
(`taskLoad`, `habitLoad`, `eventLoad`) que sume por dentro. Se descarta:
triplica la superficie de test para la misma aritmética, y arrastra el
import prohibido.

### D-B — Entra lo pendiente, no lo que pasó

Se suma lo que falta hacer:

| Qué | Entra | Por qué |
| --- | --- | --- |
| Tarea pendiente con duración, vence ese día | Sí | Es el caso central |
| Tarea completada | No | El número es lo que falta, no lo que hubo |
| Tarea atrasada, en Hoy | **Sí** | Está en la pantalla y es trabajo del día |
| Tarea atrasada, en Próximos | No | Próximos las suma a "Hoy" en el panel, pero su lista es por día de vencimiento |
| Hábito pendiente de ese día | Sí | `habits.duration_minutes` es `not null` |
| Hábito completado o salteado | No | Mismo criterio que la tarea completada |
| Evento con horario | Sí | Ocupa tiempo real del día |
| Evento de todo el día | No | No tiene duración que sumar sin inventarla |
| Tarea sin duración | No suma, **pero se cuenta aparte** | D-C |

Lo de las atrasadas es la decisión discutible: no vencen hoy, pero están
arriba de todo en Hoy, en rojo, y son lo primero que la persona va a hacer.
Un total que las excluyera diría "3h" en una pantalla que muestra ocho horas
de trabajo. Se incluyen, y el texto lo dice cuando las hay, para que nadie
tenga que deducir de dónde salió el número.

"Pendiente" para un hábito es exactamente `isHabitPendingToday`
(`lib/habits/pending-today.ts`), más el salteo — la misma definición única
que ya comparten los dos contadores de la app. No se escribe una nueva.

### D-C — Lo que no se pudo sumar se dice

Un total que ignora en silencio cuatro tareas sin duración es peor que no
mostrar nada: la persona confía en un número que subestima el día. El
formato lleva las dos partes:

```
5h 20m planificadas · 4 sin duración
```

Cuando todo tiene duración, la segunda mitad no aparece. Cuando **nada**
tiene duración, no se muestra "0m planificadas" —que sugiere un día vacío—
sino solo el conteo de lo que no se pudo medir.

### D-D — El calendario que falta no rompe el número

`useHoyEvents` ya distingue cuatro estados: `loading`, `not_connected`,
`unavailable` y `ok`. En los tres primeros el total se calcula igual, con
tareas y hábitos, y **no** se anuncia que falten eventos: Hoy ya decidió
(D-E de `hoy-con-eventos`) que sin conexión no muestra huecos ni avisos, y el
total no va a ser el primero en contradecir eso.

**Consecuencia aceptada:** mientras los eventos cargan, el número sube al
llegar. Es un parpadeo de una vez, y la alternativa —esconder el total hasta
que Google conteste— hace que la pantalla dependa de un servicio externo para
mostrar un dato que es casi todo local.

### D-E — Dónde se muestra, y dónde no

- **Hoy**: en el encabezado, junto al título. Las tres formas de ver
  comparten encabezado, así que aparece en lista, panel y calendario sin
  trabajo extra — y en el panel es el único lugar donde el número tiene
  sentido, porque el encabezado sí es del día aunque las columnas no lo sean.
- **Próximos, lista**: en el encabezado de cada día, que ya muestra un
  contador de tareas. El tiempo va al lado del contador, no lo reemplaza.
- **Próximos, panel y calendario**: no. Una columna de panel no es un día
  (salvo agrupando por fecha, y no vale sostener el número solo para ese
  caso), y la grilla del calendario ya muestra la carga mejor que un número.

### D-F — Formato

`5h 20m`, `45m`, `2h`. Sin ceros a la izquierda, sin "0m" cuando las horas
son exactas. Es el mismo criterio que `lib/habits/format.ts` ya usa para la
duración de un hábito: se reusa esa función en vez de escribir una segunda
forma de escribir lo mismo.

## Risks / Trade-offs

**[El número induce a pensar que la app va a hacer algo con él]** → Es el
riesgo de producto real: mostrar "11h planificadas" sin avisar nada puede
leerse como una función a medio hacer. Mitigación: el texto es descriptivo
("planificadas"), sin color ni ícono de alerta. Si a la larga se quiere el
aviso, es otra propuesta que tiene que decidir contra qué se compara — que es
exactamente la pregunta que se dejó afuera acá.

**[Las estimaciones son malas y el total hereda ese error]** → Nada que
mitigar desde el código; es información de la persona sobre sí misma. Vale
notar que un temporizador de tiempo real contra el estimado (otra idea del
relevamiento) es lo que haría este número confiable, y que sin él el total
vale como orden de magnitud, no como promesa.

**[Sumar atrasadas puede inflar el número de forma desmoralizante]** → Es
información verdadera. Se muestra desglosado cuando hay atrasadas, así que el
origen del número queda a la vista y no hay que adivinarlo.

**[El import prohibido se rompe por descuido]** → El test que escanea
`components/tasks/` ya existe y va a fallar. Que falle es la mitigación; que
el diseño lo prevea evita descubrirlo tarde.
