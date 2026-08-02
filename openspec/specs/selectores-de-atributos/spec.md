# selectores-de-atributos Specification

## Purpose
TBD - created by archiving change interfaz-propia. Update Purpose after archive.
## Requirements
### Requirement: El selector de fecha combina texto en lenguaje natural, accesos rápidos y calendario

El selector de fecha SHALL ofrecer un campo de texto que interpreta lenguaje natural, un conjunto de accesos rápidos (hoy, mañana, este fin de semana, próxima semana) y un calendario mensual navegable, como formas equivalentes de elegir la misma fecha.

#### Scenario: Los accesos rápidos muestran a qué día caen

- **WHEN** se abre el selector de fecha
- **THEN** cada acceso rápido (hoy, mañana, este fin de semana, próxima semana) SHALL mostrar junto a su nombre el día concreto al que corresponde

#### Scenario: Los accesos rápidos se muestran en dos filas de dos

- **WHEN** se abre el selector de fecha
- **THEN** los cuatro accesos rápidos SHALL mostrarse distribuidos en dos filas de dos
- **AND** cada fila SHALL ocupar todo el ancho disponible del selector

#### Scenario: El calendario mensual se navega hacia adelante y hacia atrás

- **WHEN** se abre el calendario del selector de fecha
- **THEN** SHALL poder navegarse a meses anteriores y siguientes
- **AND** SHALL poder elegirse cualquier día visible como la fecha

### Requirement: El campo de texto se apoya en el parser de lenguaje natural existente

El campo de texto del selector de fecha SHALL interpretar lenguaje natural usando el parser de `lib/parser/` descrito en la capacidad `parser-lenguaje-natural`, y NUNCA SHALL implementar una segunda interpretación de fechas independiente de ese contrato.

#### Scenario: El campo de texto reconoce lo mismo que el contrato del parser

- **WHEN** se escribe en el campo de texto del selector de fecha una expresión cubierta por un caso del contrato de `docs/parser-test-cases.md` (por ejemplo "mañana" o "el lunes")
- **THEN** la fecha resuelta SHALL coincidir con la que resuelve el parser para ese mismo caso

#### Scenario: Ninguna lógica de fechas propia del selector contradice al parser

- **WHEN** el selector de fecha necesita interpretar texto libre
- **THEN** SHALL delegar esa interpretación al parser compartido
- **AND** NUNCA SHALL implementar reglas de interpretación de fecha propias y distintas de las del parser

### Requirement: El selector permite sumar hora y duración a la fecha elegida

El selector de fecha SHALL permitir agregar una hora y una duración estimada a la fecha elegida, quedando la hora guardada en `due_at` en vez de `due_date` cuando se especifica. El campo de hora SHALL permitir elegir de una lista y también escribir la hora directamente, y el campo de duración SHALL permitir elegir entre opciones predefinidas, escribir un valor libre, y elegir la unidad (minutos u horas) en la que se expresa ese valor, sin que cambie la columna en la que se guarda.

#### Scenario: Agregar hora mueve el valor a due_at

- **WHEN** se elige una fecha sin hora y luego se le agrega una hora concreta desde el selector
- **THEN** el valor SHALL guardarse en `due_at`
- **AND** `due_date` SHALL quedar sin valor

#### Scenario: El campo de hora acepta escribirla además de elegirla de la lista

- **WHEN** se escribe una hora directamente en el campo de hora del selector, sin elegirla de la lista
- **THEN** esa hora SHALL guardarse igual que si se hubiera elegido de la lista

#### Scenario: Agregar una duración estimada

- **WHEN** se agrega una duración estimada en minutos desde el selector de fecha
- **THEN** el valor SHALL guardarse en `duration_minutes` de la tarea

#### Scenario: La duración acepta escribir un valor libre

- **WHEN** se escribe un valor de duración directamente en vez de elegir una de las opciones predefinidas
- **THEN** ese valor SHALL guardarse en `duration_minutes` de la tarea

#### Scenario: Elegir la unidad de duración no cambia dónde se guarda el valor

- **WHEN** se elige la unidad horas y se escribe un valor de duración en esa unidad
- **THEN** el valor SHALL convertirse a minutos y guardarse en `duration_minutes`
- **AND** `duration_minutes` SHALL seguir siendo la única columna que representa la duración en el modelo de datos

### Requirement: El selector de fecha límite usa el mismo lenguaje sobre una columna distinta

El selector de fecha límite SHALL ofrecer el mismo campo de texto en lenguaje natural, los mismos accesos rápidos y el mismo calendario que el selector de fecha, aplicados sobre la columna `deadline` en vez de `due_date`/`due_at`.

#### Scenario: Elegir una fecha límite no toca la fecha de vencimiento

- **WHEN** se elige una fecha desde el selector de fecha límite de una tarea
- **THEN** el valor SHALL guardarse en `deadline`
- **AND** `due_date` y `due_at` de esa tarea SHALL permanecer sin cambios

### Requirement: La fecha límite se distingue de la fecha de vencimiento de cara al usuario

El selector de fecha límite SHALL mostrar una etiqueta y una ubicación distintas de las del selector de fecha de vencimiento, dejando claro que una es la fecha en la que se planea trabajar la tarea y la otra es el tope que no puede cruzarse.

#### Scenario: Los dos selectores conviven sin confundirse

- **WHEN** el detalle de una tarea muestra el selector de fecha de vencimiento y el selector de fecha límite al mismo tiempo
- **THEN** cada uno SHALL mostrar una etiqueta propia que identifica cuál de las dos fechas representa
- **AND** ambos SHALL poder tener valores distintos entre sí sin que uno sobrescriba al otro

### Requirement: El selector de prioridad muestra las cuatro prioridades con su color y su nombre

El selector de prioridad SHALL mostrar las cuatro prioridades con su código y su nombre —`P1 · Urgente`, `P2 · Alta`, `P3 · Media`, `P4 · Baja`—, cada una con su color, permitiendo elegir una sola a la vez.

#### Scenario: Cada opción muestra su código, su color y su nombre

- **WHEN** se abre el selector de prioridad
- **THEN** SHALL mostrarse las cuatro opciones, cada una con el punto de color de la prioridad, su código (`P1` a `P4`) y el nombre correspondiente (Urgente, Alta, Media, Baja)
- **AND** el código y el nombre SHALL mostrarse juntos, con el formato `P<n> · <nombre>`

#### Scenario: El rojo de marca se usa legítimamente para Urgente, y solo ahí

- **WHEN** se muestra la opción de prioridad Urgente en el selector
- **THEN** SHALL usarse el rojo de marca (`#EC1E2A`) como color de esa opción
- **AND** ese mismo rojo NUNCA SHALL usarse en el selector, ni en ningún otro componente de la aplicación, para indicar un error de formulario o una acción destructiva

#### Scenario: El azul de la prioridad Media se distingue del azul de marca

- **WHEN** se muestra la opción de prioridad Media (`P3`) en el selector
- **THEN** SHALL usarse un azul más visible que el azul de marca actualmente usado para esa prioridad, validado con el mismo criterio de contraste que el resto de los colores de marca y verificado en modo claro y en modo oscuro
- **AND** ese azul NUNCA SHALL coincidir con el azul de marca usado como color primario de la interfaz, para no confundir dos significados distintos

### Requirement: Los tres selectores se reutilizan en toda la aplicación

Cada uno de los tres selectores —fecha, fecha límite y prioridad— SHALL ser un único componente reutilizado en el alta de tareas, en el detalle de tarea, y en cualquier otra superficie donde se elija ese atributo, sin una implementación distinta por superficie.

#### Scenario: El mismo selector de fecha se usa en el alta y en el detalle

- **WHEN** se elige la fecha de vencimiento desde el componente de alta de tareas y, por separado, desde el detalle de una tarea ya creada
- **THEN** en los dos casos SHALL usarse la misma implementación del selector de fecha, con el mismo comportamiento

#### Scenario: El mismo selector de prioridad se usa en el alta y en el detalle

- **WHEN** se elige la prioridad desde el componente de alta de tareas y, por separado, desde el detalle de una tarea ya creada
- **THEN** en los dos casos SHALL usarse la misma implementación del selector de prioridad

### Requirement: Los tres selectores no usan controles nativos del navegador

Elegir una **fecha** o una **hora** en cualquier superficie de la aplicación NUNCA SHALL resolverse con un `<input type="date">`, un `<input type="time">`, un `<input type="datetime-local">` ni un `<select>` nativo del navegador como el control con el que el usuario interactúa. El calendario, el selector de hora y las listas de opciones SHALL ser componentes propios de la aplicación.

Esta regla NUNCA SHALL leerse como una lista cerrada de selectores: rige para el
vencimiento, la fecha límite, la prioridad, **los recordatorios, el fin de una recurrencia,
los horarios de un evento de calendario** y cualquier superficie futura que pida una fecha
o una hora.

#### Scenario: Ningún selector delega en un input nativo

- **WHEN** el usuario abre cualquier control de la aplicación para elegir una fecha o una
  hora
- **THEN** NUNCA SHALL renderizarse un `<input type="date">`, `type="time">`,
  `type="datetime-local">` ni un `<select>` nativo como el control con el que interactúa

#### Scenario: El recordatorio con fecha y hora fija usa los componentes propios

- **WHEN** el usuario elige la fecha y la hora de un recordatorio puntual
- **THEN** SHALL usar el calendario propio y el selector de hora propio de la aplicación

#### Scenario: El fin de una recurrencia usa el calendario propio

- **WHEN** el usuario elige la fecha en la que termina una serie recurrente
- **THEN** SHALL usar el calendario propio de la aplicación

#### Scenario: Los horarios de un evento usan los componentes propios

- **WHEN** el usuario elige la fecha o el horario de un evento de calendario
- **THEN** SHALL usar el calendario propio y el selector de hora propio

#### Scenario: La misma lógica de hora no se duplica

- **WHEN** dos superficies distintas ofrecen elegir una hora
- **THEN** SHALL compartir el mismo componente
- **AND** NUNCA SHALL existir una segunda copia de la lógica de formato de 12 o 24 horas ni
  de la entrada libre de hora

### Requirement: La zona horaria por tarea no entra en estos selectores

El selector de fecha y el selector de fecha límite NUNCA SHALL ofrecer un control para elegir una zona horaria específica de la tarea: la zona horaria SHALL seguir siendo la preferencia de la cuenta, sin un campo equivalente en el modelo de datos de la tarea.

#### Scenario: No hay ningún control de zona horaria en los selectores

- **WHEN** se abre el selector de fecha o el selector de fecha límite de una tarea
- **THEN** NUNCA SHALL mostrarse ningún control para elegir una zona horaria distinta de la de la cuenta

