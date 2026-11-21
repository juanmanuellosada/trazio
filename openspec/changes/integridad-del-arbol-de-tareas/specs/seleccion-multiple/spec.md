## ADDED Requirements

### Requirement: Deshacer un movimiento en lote devuelve las tareas y sus subtareas

Deshacer un movimiento en lote SHALL devolver cada tarea movida a su proyecto,
sección, padre y posición de origen, y SHALL devolver cada una de sus subtareas
al proyecto y la sección que tenía. La foto del estado previo SHALL tomarse de
la base. Si alguna actualización del deshacer falla, la interfaz SHALL
informarlo.

#### Scenario: Deshacer devuelve las subtareas a su proyecto

- **WHEN** se mueve en lote a otro proyecto una tarea que tiene 2 subtareas,
  una de ellas en una sección, y luego se deshace
- **THEN** la tarea y sus 2 subtareas vuelven al proyecto de origen
- **AND** la subtarea que estaba en una sección vuelve a esa sección

#### Scenario: Deshacer funciona sin la lista de origen cargada

- **WHEN** el movimiento en lote se hace desde una vista que no cargó la lista
  del proyecto de origen, y luego se deshace
- **THEN** las tareas vuelven a su proyecto, sección, padre y posición de
  origen

#### Scenario: Una falla al deshacer se informa

- **WHEN** al deshacer un movimiento en lote la base rechaza una de las
  actualizaciones
- **THEN** la interfaz muestra un error
