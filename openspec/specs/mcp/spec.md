# mcp Specification

## Purpose
TBD - created by archiving change integridad-del-arbol-de-tareas. Update Purpose after archive.
## Requirements
### Requirement: Las escrituras del MCP validan la ubicación de una tarea

`editar` y `crear_tarea` SHALL validar la ubicación resultante de la tarea
antes de escribir: el proyecto existe, la sección pertenece a ese proyecto, la
tarea padre existe y está en ese mismo proyecto, y la tarea padre no es la
propia tarea ni una de sus descendientes. Una ubicación inválida SHALL
rechazarse con un mensaje que indique qué campo corregir, sin modificar nada.

#### Scenario: Un ciclo se rechaza

- **WHEN** se invoca `editar` sobre una tarea poniendo como `parent_id` a una
  de sus propias subtareas
- **THEN** la llamada SHALL rechazarse con un error
- **AND** la tarea NUNCA SHALL modificarse

#### Scenario: Una tarea no puede ser su propio padre

- **WHEN** se invoca `editar` con `parent_id` igual al id de la tarea
- **THEN** la llamada SHALL rechazarse con un error

#### Scenario: Un padre de otro proyecto se rechaza

- **WHEN** se invoca `editar` con un `parent_id` de una tarea que está en un
  proyecto distinto al de la tarea editada, sin cambiar `project_id`
- **THEN** la llamada SHALL rechazarse con un error

#### Scenario: Una sección de otro proyecto se rechaza

- **WHEN** se invoca `editar` o `crear_tarea` con un `section_id` que no
  pertenece al proyecto resultante
- **THEN** la llamada SHALL rechazarse con un error

### Requirement: `editar` arrastra las subtareas al cambiar de proyecto

`editar` SHALL dejar todas las subtareas de una tarea, en cualquier nivel, en
el proyecto nuevo y sin sección cuando cambia su `project_id`.

#### Scenario: Mover una tarea con subtareas

- **WHEN** se invoca `editar` cambiando el `project_id` de una tarea sin padre
  que tiene 2 subtareas
- **THEN** la tarea y sus 2 subtareas SHALL quedar en el proyecto nuevo

#### Scenario: Reintento tras una falla del arrastre

- **WHEN** una llamada anterior movió la tarea pero no sus subtareas, y se
  invoca otra vez `editar` con el mismo `project_id`
- **THEN** las subtareas que quedaron atrás SHALL quedar en ese proyecto
- **AND** las subtareas que ya estaban en él NUNCA SHALL perder su sección

### Requirement: `crear_tarea` con padre hereda el proyecto del padre

Cuando `crear_tarea` recibe `parent_id`, la tarea SHALL crearse en el proyecto
de la tarea padre. Si el texto o `project_id` indican un proyecto distinto, la
llamada SHALL rechazarse. La tarea SHALL quedar sin sección salvo que se
indique una, que SHALL pertenecer al proyecto del padre.

#### Scenario: Subtarea sin proyecto indicado

- **WHEN** se invoca `crear_tarea` con `parent_id` de una tarea del proyecto
  `Casa`, sin `project_id` ni `#proyecto` en el texto
- **THEN** la tarea SHALL crearse en `Casa`, como subtarea de esa tarea

#### Scenario: Subtarea con sección indicada

- **WHEN** se invoca `crear_tarea` con `parent_id` de una tarea del proyecto
  `Casa` y `section_id` de una sección de `Casa`
- **THEN** la tarea SHALL crearse en esa sección

#### Scenario: Proyecto en conflicto con el padre

- **WHEN** se invoca `crear_tarea` con `parent_id` de una tarea del proyecto
  `Casa` y `project_id` del proyecto `Trabajo`
- **THEN** la llamada SHALL rechazarse con un error
- **AND** NUNCA SHALL crearse ninguna tarea

### Requirement: `completar_tarea` es idempotente

Invocar `completar_tarea` con el estado que la tarea ya tiene NUNCA SHALL
modificarla ni duplicar su ocurrencia siguiente. Si la tarea es recurrente,
ya estaba completada y su ocurrencia siguiente no existe, la llamada SHALL
crearla, calculada desde la fecha del completado original.

#### Scenario: Completar dos veces una tarea recurrente

- **WHEN** se invoca `completar_tarea` con `completado: true` dos veces
  seguidas sobre la misma tarea recurrente
- **THEN** SHALL existir una sola ocurrencia siguiente
- **AND** la fecha de completado de la tarea SHALL ser la de la primera
  llamada

#### Scenario: Reintento tras una falla parcial

- **WHEN** una tarea recurrente quedó completada sin que se creara su
  ocurrencia siguiente, y se invoca otra vez `completar_tarea` con
  `completado: true`
- **THEN** SHALL crearse la ocurrencia siguiente

#### Scenario: La ocurrencia siguiente ya se completó

- **WHEN** se invoca otra vez `completar_tarea` con `completado: true` sobre
  una tarea recurrente cuya ocurrencia siguiente ya existe y está completada
- **THEN** NUNCA SHALL crearse otra ocurrencia para esa fecha

### Requirement: El MCP reemplaza las etiquetas sin dejar a la tarea sin ninguna

`editar` con `labels` SHALL asignar primero las etiquetas nuevas y después
quitar las que sobran, con el mismo criterio que la interfaz.

#### Scenario: Falla la asignación de una etiqueta

- **WHEN** se invoca `editar` con un conjunto de `labels` y la base rechaza la
  asignación de una etiqueta nueva
- **THEN** la tarea SHALL conservar las etiquetas que tenía

### Requirement: `crear_tarea` avisa si no pudo asignar las etiquetas

Si `crear_tarea` creó la tarea pero no pudo asignar sus etiquetas, SHALL
devolver la tarea creada junto con un aviso que lo explique.

#### Scenario: Falla la asignación de etiquetas al crear

- **WHEN** se invoca `crear_tarea` con un texto que incluye `@etiqueta` y la
  base rechaza la asignación
- **THEN** la respuesta SHALL incluir la tarea creada, sin etiquetas
- **AND** SHALL incluir un aviso

