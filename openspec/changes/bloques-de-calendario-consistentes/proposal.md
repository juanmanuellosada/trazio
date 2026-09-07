## Why

En la grilla del calendario, un hábito cambia de forma según cuánto dura. La regla
que lo dibuja pide un radio de píldora, y como el alto del bloque sale de su
duración, ese radio se resuelve a la mitad del alto: un hábito de 10 minutos se ve
como una píldora prolija, uno de 45 minutos como una cápsula deformada, y uno de dos
horas como un óvalo. La tarea de al lado, en cambio, conserva su radio pase lo que
pase. El resultado es que dos bloques de la misma familia no se parecen entre sí, y
ninguno se parece a una tarea.

Al mismo tiempo, el control para completar —el círculo a la izquierda del título—
está escrito cinco veces en el código, con cuatro tamaños distintos y dos criterios
distintos de color. El mismo gesto se ve distinto según la pantalla donde estés.

## What Changes

- La forma de un bloque deja de depender de su duración: todos los bloques de la
  grilla usan el mismo radio, estable en un bloque de diez minutos y en uno de tres
  horas.
- La distinción entre tarea, hábito y evento pasa a apoyarse en el borde y no en el
  radio: la tarea lleva borde grueso, el hábito borde fino, el evento conserva su
  barra lateral izquierda. La regla de fondo no cambia —los tres tipos se siguen
  distinguiendo sin depender del color— pero el canal que la sostiene sí.
- El control de completar pasa a ser una primitiva compartida, con un tamaño chico
  para los bloques apretados del calendario y uno normal para las listas. Deja de
  estar copiado en cinco archivos.
- Se conserva a propósito la diferencia de color del control sin marcar: en el
  calendario toma el color del bloque, en las listas usa el color de borde neutro.
  Pasa de ser una divergencia accidental a una decisión explícita del componente.

Fuera de alcance, para no mezclar: la manija de redimensionar siempre visible, y el
caso del hábito cuyo emoji es un ✅ y se lee como un segundo control al lado del
círculo. Los dos quedan anotados para después.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `vista-calendario`: la distinción por forma entre tarea, hábito y evento se
  sostiene ahora en el borde del bloque, y se agrega que la forma de un bloque
  NUNCA depende de su duración.
- `sistema-de-componentes`: el control de completar se suma a las primitivas
  compartidas, con la misma lógica que ya rige para la capa superpuesta.

## Impact

Código afectado:

- `components/calendar/calendar-block-chip.tsx` — el mapa de formas por tipo y el
  control de completar escrito inline.
- Las cinco superficies que hoy repiten el control: `components/tasks/task-row.tsx`,
  `components/habits/habit-today-row.tsx`,
  `components/tasks/task-detail-content.tsx` y `components/habits/habit-card.tsx`.
  `components/public/public-task-row.tsx` queda afuera: no tiene este control, usa
  íconos de Lucide y no es interactivo.
- `docs/design-system.md` — la tabla de radios reserva el radio de píldora para
  chips y avatar; el uso actual en bloques queda fuera de esa regla y la
  documentación tiene que reflejar dónde se usa cada radio.

Sin impacto en datos, API ni migraciones: es un cambio de presentación.

Verificación: `components/calendar/calendar-block-chip.test.tsx` cubre hoy el modo
apretado, la escalera de contenido y el tamaño del control; hay que actualizarlo, no
saltearlo. Cierre con `pnpm lint && pnpm typecheck && pnpm test`.
