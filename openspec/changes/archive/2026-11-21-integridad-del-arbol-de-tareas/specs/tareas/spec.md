## ADDED Requirements

### Requirement: Mover una tarea a otro proyecto arrastra todo su subárbol

Mover una tarea a otro proyecto SHALL dejar todas sus subtareas, en cualquier
nivel, en el proyecto destino y sin sección. El conjunto de subtareas a
arrastrar SHALL leerse de la base y NUNCA SHALL depender de qué listas tenga
cargadas la interfaz.

#### Scenario: Mover desde una vista que no cargó el proyecto de origen

- **WHEN** una tarea con 2 subtareas se mueve a otro proyecto desde Hoy, sin
  que la lista de su proyecto de origen se haya cargado nunca
- **THEN** la tarea y sus 2 subtareas quedan en el proyecto destino
- **AND** las 2 subtareas quedan sin sección

#### Scenario: Mover arrastra subtareas de varios niveles

- **WHEN** se mueve a otro proyecto una tarea que tiene una subtarea, que a su
  vez tiene otra subtarea
- **THEN** las tres tareas quedan en el proyecto destino

### Requirement: El recorrido de un subárbol termina siempre

El recorrido de una tarea y sus descendientes SHALL terminar aunque los datos
guardados contengan un ciclo de `parent_id`; aplica a borrar, duplicar y
mover. Cada tarea SHALL aparecer una sola vez en el recorrido.

#### Scenario: Un ciclo guardado no cuelga el recorrido

- **WHEN** existen dos tareas en las que cada una es padre de la otra y se
  recorre el subárbol de una de ellas
- **THEN** el recorrido termina y devuelve cada tarea una sola vez
