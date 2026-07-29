## MODIFIED Requirements

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
