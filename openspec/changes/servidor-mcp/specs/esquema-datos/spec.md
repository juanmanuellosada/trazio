## ADDED Requirements

### Requirement: `position` se completa en la base cuando el insert no la incluye

Las tablas `tasks` y `projects` SHALL aceptar un `insert` sin la columna
`position`. Cuando `position` no se provee (o llega `null`), un trigger
`BEFORE INSERT` SHALL calcularla como la posición del último hermano de la
fila (mismo `user_id`, `project_id`, `section_id` y `parent_id` para
`tasks`; mismo `user_id` y `parent_id` para `projects`) más el espaciado
estándar, con `0` como base cuando no hay hermanos — el mismo criterio que
hoy calcula `lib/tasks/tree.ts` y `lib/projects/tree.ts` del lado del
cliente. Cuando el `insert` sí incluye `position`, el trigger NUNCA SHALL
sobrescribirla.

#### Scenario: Crear una tarea sin `position` la deja como último hermano

- **WHEN** se inserta una tarea sin `position`, en un proyecto y sección que
  ya tienen tareas
- **THEN** la tarea creada SHALL quedar con una `position` mayor que la de
  todos sus hermanos existentes

#### Scenario: Crear la primera tarea de un contexto sin hermanos

- **WHEN** se inserta una tarea sin `position` en un proyecto o sección sin
  ninguna otra tarea en ese mismo contexto
- **THEN** la tarea creada SHALL recibir una `position` válida sin error

#### Scenario: Un insert que sí manda `position` no se toca

- **WHEN** se inserta una tarea o un proyecto indicando `position`
  explícitamente
- **THEN** la fila creada SHALL conservar exactamente esa `position`

#### Scenario: El mismo criterio aplica a proyectos

- **WHEN** se inserta un proyecto sin `position`, con hermanos existentes en
  el mismo nivel del árbol
- **THEN** el proyecto creado SHALL quedar con una `position` mayor que la
  de sus hermanos
