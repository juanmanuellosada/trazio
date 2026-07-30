## ADDED Requirements

### Requirement: Pantallas donde está disponible la selección múltiple

La selección múltiple SHALL estar disponible en las pantallas Bandeja de
entrada, Hoy, Próximos, Proyecto, Etiqueta y Filtro.

#### Scenario: Disponible en las seis pantallas de lista

- **WHEN** se está en la Bandeja de entrada, en Hoy, en Próximos, en la
  pantalla de un proyecto, en la pantalla de una etiqueta o en la pantalla de
  resultados de un filtro
- **THEN** cada tarea de la lista muestra, al pasar el cursor sobre ella, un
  casillero de selección independiente del casillero de completar

### Requirement: Entrar al modo de selección

El modo de selección SHALL activarse al hacer clic en el casillero de
selección de una tarea. Al activarse, esa tarea queda seleccionada y aparece
la barra de acciones en lote.

#### Scenario: Un clic en el casillero de selección activa el modo

- **WHEN** en una lista sin ninguna tarea seleccionada, se hace clic en el
  casillero de selección de una tarea
- **THEN** el modo de selección se activa, esa tarea queda seleccionada, y
  aparece la barra de acciones en lote mostrando "1 seleccionada"

### Requirement: Seleccionar y deseleccionar tareas individuales

Con el modo de selección activo, cada casillero de selección SHALL quedar
visible sin necesidad de pasar el cursor por encima, y un clic sobre él SHALL
alternar esa tarea entre seleccionada y no seleccionada.

#### Scenario: Clic en otro casillero suma una tarea a la selección

- **WHEN** con una tarea ya seleccionada, se hace clic en el casillero de
  selección de otra tarea de la misma lista
- **THEN** ambas tareas quedan seleccionadas y la barra muestra "2
  seleccionadas"

#### Scenario: Clic en un casillero ya seleccionado la saca de la selección

- **WHEN** con dos tareas seleccionadas, se hace clic en el casillero de una
  de ellas
- **THEN** esa tarea queda deseleccionada y la barra pasa a mostrar "1
  seleccionada"

### Requirement: Selección de rango con Shift+clic

`⇧clic` (Shift+clic) sobre el casillero de selección de una tarea SHALL
seleccionar todas las tareas entre la última tarea sobre la que se hizo clic y
la tarea clickeada, en el orden visual actual de la lista, inclusive ambos
extremos.

#### Scenario: Shift+clic selecciona un rango completo

- **WHEN** se hace clic en el casillero de selección de la tarea que ocupa la
  tercera posición de la lista, y luego se hace `⇧clic` en el casillero de la
  tarea que ocupa la séptima posición
- **THEN** las cinco tareas de la tercera a la séptima posición quedan
  seleccionadas y la barra muestra "5 seleccionadas"

### Requirement: Salir del modo de selección

`Escape` SHALL salir del modo de selección, deseleccionando todas las tareas y
ocultando la barra de acciones en lote. El modo de selección SHALL salir
también automáticamente cuando la cantidad de tareas seleccionadas llega a
cero.

#### Scenario: Escape sale del modo de selección

- **WHEN** con tres tareas seleccionadas se presiona `Escape`
- **THEN** las tres tareas quedan deseleccionadas y la barra de acciones en
  lote desaparece

#### Scenario: Deseleccionar la última tarea sale del modo automáticamente

- **WHEN** con una sola tarea seleccionada, se hace clic en su casillero de
  selección para deseleccionarla
- **THEN** el modo de selección se desactiva y la barra de acciones en lote
  desaparece

### Requirement: Barra de acciones en lote

Con el modo de selección activo, la barra de acciones en lote SHALL ofrecer:
seleccionar todas las tareas visibles, mover las tareas seleccionadas a otro
proyecto o sección, cambiar la prioridad de las tareas seleccionadas, cambiar
la fecha de las tareas seleccionadas (con los atajos Hoy, Mañana y Sin fecha),
y eliminar las tareas seleccionadas.

#### Scenario: Seleccionar todas las tareas visibles

- **WHEN** con el modo de selección activo se elige la acción "seleccionar
  todas" en una lista de 15 tareas visibles
- **THEN** las 15 tareas quedan seleccionadas

#### Scenario: Mover en lote a otro proyecto o sección

- **WHEN** con 4 tareas seleccionadas se elige "mover a" y se indica un
  proyecto y una sección de destino
- **THEN** las 4 tareas quedan ubicadas en ese proyecto y esa sección

#### Scenario: Cambiar la prioridad en lote

- **WHEN** con 3 tareas seleccionadas se elige "cambiar prioridad" y se indica
  `P1 · Urgente`
- **THEN** las 3 tareas quedan con prioridad `1`

#### Scenario: Cambiar la fecha en lote con los atajos Hoy, Mañana y Sin fecha

- **WHEN** con 5 tareas seleccionadas se elige "cambiar fecha" y se presiona
  el atajo "Mañana"
- **THEN** las 5 tareas quedan con fecha de vencimiento igual a la fecha de
  mañana

#### Scenario: Eliminar en lote

- **WHEN** con 12 tareas seleccionadas se elige "eliminar"
- **THEN** las 12 tareas se eliminan

### Requirement: Las acciones en lote son deshacibles como una sola acción

Toda acción en lote SHALL empujar una única entrada a la pila de deshacer,
sin importar cuántas tareas afecte. Deshacer esa entrada SHALL revertir la
acción sobre todas las tareas afectadas de una sola vez.

#### Scenario: Deshacer una eliminación en lote de 12 tareas la revierte de una vez

- **WHEN** se eliminan 12 tareas seleccionadas y luego se presiona
  `Ctrl/Cmd+Z` una sola vez
- **THEN** las 12 tareas se restauran de una vez, y no hace falta presionar
  `Ctrl/Cmd+Z` doce veces
