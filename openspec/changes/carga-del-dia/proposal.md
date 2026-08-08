## Why

Trazio ya pide duración estimada en cada tarea y en cada hábito, y ya la usa
para dibujar el alto del bloque en el calendario. Pero nunca la suma. La
consecuencia es que se puede planificar un día con catorce horas de trabajo
sin que nada lo insinúe: la lista de Hoy se ve igual con tres tareas que con
veinte, y el calendario lo muestra pero no lo dice.

Sumar lo planificado es lo que separa una lista de tareas de un planificador
del día — es el centro de Sunsama, Motion y Amie —, y acá el dato ya está
cargado. Falta mostrarlo.

## What Changes

- Hoy y cada día de la lista de Próximos SHALL mostrar **cuánto tiempo suma
  lo que hay planificado** ese día: "5h 20m planificadas".
- La suma toma las tareas pendientes con duración, los hábitos pendientes de
  ese día con duración, y los eventos con horario del calendario conectado.
- En Hoy, las tareas **atrasadas** entran en la suma: están en la pantalla y
  son trabajo del día. El total lo dice explícitamente cuando las incluye.
- Lo que ya se completó o se salteó **NUNCA** entra: el número es lo que
  falta, no lo que hubo.
- Lo que no tiene duración no se suma, pero **SHALL decirse** ("+4 sin
  duración"): un total que ignora cuatro tareas en silencio miente.
- **El número no juzga.** No hay color de alerta, ni comparación contra una
  capacidad, ni aviso de que no entra. Es un dato, no una opinión —
  comparar contra los huecos reales del calendario es una decisión que se
  evaluó y se dejó explícitamente afuera.
- Sin conexión de calendario, o con Google caído, el total se muestra igual
  con lo que hay, sin hueco ni error.

## Capabilities

### New Capabilities

- `carga-del-dia`: qué entra y qué no entra en el total del día, cómo se
  formatea, dónde se muestra, y qué pasa cuando falta información (tareas sin
  duración, calendario no conectado).

### Modified Capabilities

- `vista-proximos`: el encabezado de cada día, que hoy muestra un contador de
  tareas, suma el tiempo planificado.

## Impact

**Lógica** — módulo nuevo de cálculo puro que recibe duraciones ya resueltas
y devuelve el total. Vive aparte a propósito: `components/tasks/` tiene
**prohibido** importar de `lib/calendar/`, y hay un test que lo verifica
escaneando la carpeta (`lib/calendar/tasks-and-habits-never-publish-to-google.test.ts`).
La composición con eventos va en `components/calendar/`, junto a
`use-hoy-events.ts`, que ya resuelve exactamente ese problema.

**Interfaz** — encabezado de `components/tasks/hoy-view.tsx` y encabezado de
día de la lista de Próximos.

**Datos** — ninguno. `tasks.duration_minutes`, `habits.duration_minutes` y la
duración de un evento ya existen. Sin migración.

**Fuera de alcance** — comparar contra los huecos libres del día, capacidad
configurable por persona, avisos de sobrecarga, auto-agendado, y el total en
la vista de panel (una columna de panel no es un día).
