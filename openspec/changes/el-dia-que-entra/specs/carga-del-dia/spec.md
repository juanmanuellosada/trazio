## MODIFIED Requirements

### Requirement: El día muestra cuánto tiempo suma lo planificado

Hoy SHALL mostrar, en su encabezado, cuánto tiempo libre queda entre ahora y
la hora de fin del día (preferencia de Configuración, default 22:00), y
cuánto de lo pendiente todavía no tiene hora asignada en el calendario
("pedido sin lugar"), formateado como "Te quedan 3h 40m libres y 2h 15m de
tareas sin agendar". El texto SHALL mostrarse en las tres formas de ver,
porque el encabezado es común a las tres.

Cuando el pedido sin lugar no entra en el tiempo libre que queda, el
encabezado SHALL avisarlo.

El texto NUNCA SHALL acompañarse de un color de alerta, un ícono de
advertencia, ni ningún tratamiento visual que trate un día cargado distinto
de uno liviano. Comparar contra el tiempo disponible y avisar cuando algo no
entra es aritmética sobre datos que la persona cargó, no una opinión sobre
ella (decisión D61).

#### Scenario: Hoy muestra el tiempo libre y lo sin agendar

- **WHEN** a Hoy le quedan 3h 40m libres entre ahora y la hora de fin del
  día, y 2h 15m de tareas pendientes sin hora asignada
- **THEN** el encabezado muestra "Te quedan 3h 40m libres y 2h 15m de tareas
  sin agendar"

#### Scenario: El texto aparece en las tres formas de ver

- **WHEN** se cambia la forma de ver de Hoy entre lista, panel y calendario
- **THEN** el tiempo libre y lo sin agendar siguen visibles en el
  encabezado

#### Scenario: Se avisa cuando lo pedido no entra

- **WHEN** a Hoy le quedan 3h 40m libres y el pedido sin lugar suma 5h
- **THEN** el encabezado avisa que lo pendiente no entra en el tiempo libre
  que queda

#### Scenario: El total no juzga

- **WHEN** un día tiene mucho más pedido sin lugar del que entra en el
  tiempo libre restante
- **THEN** el encabezado se muestra con el mismo tratamiento visual que
  cualquier otro día
- **AND** NUNCA SHALL mostrarse un color de alerta ni un ícono de
  advertencia, aunque el texto sí diga que no entra

### Requirement: Lo que no tiene duración se cuenta aparte

Lo que no tiene duración estimada NUNCA SHALL sumarse ni al tiempo libre ni
al pedido sin lugar, pero SHALL informarse cuántos elementos quedaron sin
medir. Un total que omite elementos en silencio NUNCA SHALL mostrarse.

Cuando ningún elemento pendiente del día tiene duración, el pedido sin lugar
NUNCA SHALL mostrarse en cero: SHALL mostrarse únicamente el conteo de lo
que no se pudo medir.

#### Scenario: Se informan las tareas sin duración

- **WHEN** Hoy tiene tareas y hábitos pendientes que suman 2h 15m de pedido
  sin lugar, y cuatro tareas más sin duración estimada
- **THEN** el encabezado de Hoy muestra el pedido sin lugar junto con la
  indicación de que hay 4 sin duración

#### Scenario: Un día donde nada tiene duración no muestra cero

- **WHEN** un día tiene cinco tareas pendientes y ninguna tiene duración
  estimada
- **THEN** NUNCA SHALL mostrarse "0m" de pedido sin lugar
- **AND** SHALL indicarse que las 5 no tienen duración

#### Scenario: Todo con duración no muestra el aparte

- **WHEN** todas las tareas y hábitos pendientes del día tienen duración
- **THEN** solo se muestra el tiempo libre y el pedido sin lugar, sin
  ninguna indicación adicional

## ADDED Requirements

### Requirement: El total se separa en comprometido y pedido sin lugar

El planificado del día SHALL separarse, en Hoy, en dos partes según tenga o
no una hora asignada, sobre la misma clasificación que ya define "Qué
entra en el total": **comprometido** (eventos con horario, tareas con
`due_at` de hoy, hábitos con hora efectiva de hoy) y **pedido sin lugar**
(tareas y hábitos pendientes con duración estimada pero sin hora). Solo lo
comprometido SHALL descontar tiempo libre; el pedido sin lugar SHALL
mostrarse aparte, sin descontarlo.

#### Scenario: Una tarea con hora resta tiempo libre, una sin hora no

- **WHEN** Hoy tiene una tarea de 60 minutos agendada a las 15:00 y otra de
  60 minutos sin hora asignada, ambas pendientes
- **THEN** la tarea de las 15:00 SHALL descontar tiempo libre en esa franja
- **AND** la tarea sin hora SHALL sumar al pedido sin lugar, sin descontar
  tiempo libre

### Requirement: El tiempo libre se calcula desde ahora hasta la hora de fin del día

El tiempo libre SHALL calcularse como la ventana entre el momento actual y
la hora de fin del día (preferencia de Configuración), menos lo comprometido
que cae dentro de esa ventana. Un bloque comprometido que ya terminó NUNCA
SHALL descontar tiempo libre; uno en curso SHALL descontar únicamente la
parte que todavía no transcurrió.

Cuando el momento actual es posterior a la hora de fin del día, el tiempo
libre SHALL mostrarse en cero, NUNCA en un valor negativo, y el encabezado
SHALL indicar que el día ya terminó en vez de mostrar "0m libres" sin
contexto.

#### Scenario: Un bloque que ya pasó no descuenta tiempo libre

- **WHEN** son las 16:00 y hay una tarea agendada de 12:15 a 13:00
- **THEN** esa tarea NUNCA SHALL descontar tiempo libre del cálculo

#### Scenario: Un bloque en curso descuenta solo lo que falta

- **WHEN** son las 14:15 y hay un evento de 14:00 a 15:00
- **THEN** el tiempo libre descuenta únicamente los 45 minutos que faltan
  del evento, no la hora completa

#### Scenario: El día terminado no muestra un número negativo

- **WHEN** el momento actual es posterior a la hora de fin del día
- **THEN** el tiempo libre se muestra en cero
- **AND** NUNCA SHALL mostrarse un valor negativo
- **AND** el encabezado indica que el día terminó, no "0m libres"

### Requirement: El tiempo libre se calcula igual sin calendario conectado

El tiempo libre SHALL calcularse y mostrarse con la información disponible
aunque el calendario no esté conectado, esté cargando, o Google no responda.
En ninguno de esos casos SHALL mostrarse un hueco, un error o un aviso de
que faltan eventos: se calcula solo con tareas y hábitos con hora.

#### Scenario: Sin calendario conectado el tiempo libre se muestra igual

- **WHEN** la cuenta no tiene ningún calendario de Google conectado
- **THEN** el tiempo libre se calcula con tareas y hábitos con hora
- **AND** NUNCA SHALL mostrarse un aviso de que faltan eventos

#### Scenario: Google caído no rompe el cálculo

- **WHEN** la consulta de eventos devuelve un estado de no disponible
- **THEN** el tiempo libre se calcula igual con tareas y hábitos
