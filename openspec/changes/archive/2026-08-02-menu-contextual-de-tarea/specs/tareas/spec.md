## ADDED Requirements

### Requirement: Menú de acciones de una tarea, por clic derecho y por botón

Cada tarea SHALL ofrecer un menú de acciones que SHALL abrirse tanto con **clic derecho
sobre la fila** como desde su botón de acciones. Las dos entradas SHALL abrir el **mismo**
menú: NUNCA SHALL existir una lista de acciones para el clic derecho y otra distinta para
el botón.

El clic derecho SHALL seguir mostrando el menú del navegador cuando el usuario lo hace
sobre un enlace, sobre texto seleccionado o dentro de un campo de edición.

#### Scenario: El clic derecho sobre una tarea abre su menú

- **WHEN** el usuario hace clic derecho sobre una fila de tarea
- **THEN** SHALL abrirse el menú de acciones de esa tarea
- **AND** NUNCA SHALL aparecer el menú del navegador

#### Scenario: Las dos entradas abren lo mismo

- **WHEN** se compara el menú abierto con clic derecho con el abierto desde el botón de
  acciones de la misma tarea
- **THEN** SHALL ofrecer las mismas acciones

#### Scenario: El clic derecho sobre un campo de edición no se secuestra

- **WHEN** el usuario hace clic derecho dentro de un campo de texto editable de la fila, o
  sobre texto que tiene seleccionado
- **THEN** SHALL aparecer el menú del navegador
- **AND** NUNCA SHALL abrirse el menú de la tarea

### Requirement: El menú resuelve fecha y prioridad sin abrir el detalle

El menú de acciones SHALL permitir cambiar la fecha y la prioridad de la tarea **desde el
propio menú**, sin abrir el detalle. Para la fecha SHALL ofrecer los accesos rápidos, la
opción de quitarla y la de abrir el selector completo; para la prioridad, las cuatro.

El menú SHALL ofrecer además fecha límite y recordatorios, delegando en sus selectores.

#### Scenario: Poner una fecha rápida desde el menú

- **WHEN** el usuario elige un acceso rápido de fecha desde el menú de una tarea
- **THEN** la tarea SHALL quedar con esa fecha
- **AND** NUNCA SHALL abrirse el detalle para lograrlo

#### Scenario: Quitar la fecha desde el menú

- **WHEN** el usuario elige quitar la fecha desde el menú de una tarea que tenía una
- **THEN** la tarea SHALL quedar sin fecha

#### Scenario: Abrir el selector completo de fecha desde el menú

- **WHEN** el usuario elige la opción de ver más fechas
- **THEN** SHALL abrirse el selector de fecha completo

#### Scenario: Cambiar la prioridad desde el menú

- **WHEN** el usuario elige una de las cuatro prioridades desde el menú
- **THEN** la tarea SHALL quedar con esa prioridad
- **AND** NUNCA SHALL abrirse el detalle para lograrlo

### Requirement: Agregar una tarea encima o debajo desde el menú

El menú de acciones SHALL ofrecer agregar una tarea inmediatamente encima o inmediatamente
debajo de la tarea de referencia. Esas altas SHALL resolverse con el componente de alta
compartido, y NUNCA SHALL tener implementación propia.

La tarea nueva SHALL heredar el contexto de la de referencia: su proyecto, su sección y su
tarea padre si la tuviera.

#### Scenario: Agregar una tarea debajo

- **WHEN** el usuario elige agregar una tarea debajo y confirma el alta
- **THEN** la tarea nueva SHALL quedar inmediatamente después de la de referencia
- **AND** SHALL quedar en el mismo proyecto y la misma sección

#### Scenario: Agregar una tarea encima

- **WHEN** el usuario elige agregar una tarea encima y confirma el alta
- **THEN** la tarea nueva SHALL quedar inmediatamente antes de la de referencia

#### Scenario: Agregar debajo de una subtarea crea otra subtarea

- **WHEN** la tarea de referencia es una subtarea
- **THEN** la tarea nueva SHALL quedar como subtarea del mismo padre
- **AND** el alta NUNCA SHALL mostrar selector de destino, según la regla de subtareas de
  `alta-de-tareas`
