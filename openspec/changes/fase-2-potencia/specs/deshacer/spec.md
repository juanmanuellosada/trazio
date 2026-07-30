## ADDED Requirements

### Requirement: Ctrl/Cmd+Z deshace en cualquier momento, incluso con el foco en un campo de texto

`Ctrl/Cmd+Z` SHALL disparar el deshacer de la última acción de la pila en
cualquier momento, incluso con el foco puesto en un `input`, un `textarea` o
un elemento `contenteditable`. Es el único atajo de la aplicación con esa
excepción.

#### Scenario: Ctrl/Cmd+Z funciona con el foco en un campo de texto simple

- **WHEN** el foco está en el campo de título de una tarea, y la última acción
  de la pila fue eliminar otra tarea
- **THEN** `Ctrl/Cmd+Z` restaura esa tarea eliminada, sin alterar el texto que
  se estaba escribiendo en el campo de título

### Requirement: Con el editor Tiptap enfocado, el editor deshace su propia edición primero

`Ctrl/Cmd+Z` SHALL revertir primero el último cambio de texto dentro del
editor Tiptap cuando el elemento con foco es el editor Tiptap de la
descripción de una tarea o de un comentario, en lugar de la última acción de
la pila global de deshacer.

#### Scenario: Ctrl/Cmd+Z revierte el texto del editor antes que la pila global

- **WHEN** el foco está en el editor Tiptap de la descripción de una tarea,
  con un cambio de texto reciente sin guardar, y la pila global tiene una
  acción pendiente de deshacer
- **THEN** `Ctrl/Cmd+Z` revierte el último cambio de texto dentro del editor,
  y la acción pendiente de la pila global sigue disponible sin deshacerse

### Requirement: Pila de acciones acotada a 20, en memoria, por sesión

La pila de deshacer SHALL mantener como máximo las 20 acciones más recientes,
en memoria. La pila MUST NOT persistirse en almacenamiento ni sincronizarse
entre pestañas, dispositivos o sesiones.

#### Scenario: La acción número 21 descarta la más antigua

- **WHEN** se realizan 21 acciones deshacibles en la misma sesión, una tras
  otra
- **THEN** la pila conserva las 20 más recientes, y la primera de las 21 ya no
  puede deshacerse

#### Scenario: La pila no sobrevive a recargar la página ni a otro dispositivo

- **WHEN** se realiza una acción deshacible y luego se recarga la página, o se
  abre la misma cuenta en otro dispositivo
- **THEN** la pila de deshacer aparece vacía en esa nueva carga o en ese otro
  dispositivo

### Requirement: Toda acción destructiva muestra un toast con opción de deshacer

Toda acción destructiva SHALL mostrar, además de empujar su entrada a la pila,
un toast con una opción para deshacerla.

#### Scenario: Eliminar una tarea muestra un toast con deshacer

- **WHEN** se elimina una tarea
- **THEN** aparece un toast con el mensaje de la eliminación y un botón
  "Deshacer"

### Requirement: Deshacer desde el toast saca la acción de la pila

Deshacer una acción desde el botón del toast SHALL revertirla y, en el mismo
paso, SHALL sacarla de la pila de deshacer, de modo que no quede disponible
para deshacerse una segunda vez desde `Ctrl/Cmd+Z`.

#### Scenario: Deshacer desde el toast no vuelve a deshacerse con Ctrl/Cmd+Z

- **WHEN** se elimina la tarea A, luego se elimina la tarea B, y se presiona
  "Deshacer" en el toast de la tarea A
- **THEN** la tarea A se restaura y su entrada sale de la pila, y al presionar
  `Ctrl/Cmd+Z` a continuación se deshace la eliminación de la tarea B, no la
  de la tarea A otra vez

### Requirement: Restaurar una tarea eliminada restaura sus subtareas, sus etiquetas y sus comentarios

Deshacer la eliminación de una tarea SHALL restaurar la tarea completa: sus
subtareas, sus etiquetas asociadas (`task_labels`) y sus comentarios.

#### Scenario: Restaurar una tarea con subtareas, etiquetas y comentarios

- **WHEN** se elimina una tarea que tiene 2 subtareas, 3 etiquetas asignadas y
  1 comentario, y luego se presiona `Ctrl/Cmd+Z`
- **THEN** la tarea se restaura junto con sus 2 subtareas, sus 3 etiquetas
  asignadas y su comentario

### Requirement: Deshacer completar una tarea y deshacer la última edición

`Ctrl/Cmd+Z` SHALL revertir, según cuál haya sido la última acción sobre una
tarea, completarla (volviéndola a pendiente) o su última edición de campos.

#### Scenario: Deshacer vuelve a poner pendiente una tarea recién completada

- **WHEN** se marca una tarea como completada y luego se presiona
  `Ctrl/Cmd+Z`
- **THEN** esa tarea vuelve a quedar pendiente, con `completed_at` en `null`
  otra vez

#### Scenario: Deshacer revierte la última edición de campos

- **WHEN** se cambia la prioridad de una tarea de `4` (Baja) a `1` (Urgente) y
  luego se presiona `Ctrl/Cmd+Z`
- **THEN** esa tarea vuelve a quedar con prioridad `4`

### Requirement: El borrado de proyecto y el borrado de etiqueta no entran en la pila de deshacer

El borrado de un proyecto y el borrado de una etiqueta MUST NOT empujar
ninguna entrada a la pila de deshacer. Ambos exigen confirmación explícita
antes de ejecutarse; la confirmación de borrar un proyecto SHALL mostrar
cuántas tareas se pierden.

#### Scenario: Borrar un proyecto pide confirmación con el conteo de tareas y no es deshacible

- **WHEN** se elige eliminar un proyecto que tiene 8 tareas
- **THEN** se pide confirmación explícita mostrando que se perderán 8 tareas,
  y una vez confirmado el borrado, `Ctrl/Cmd+Z` no lo revierte

#### Scenario: Borrar una etiqueta pide confirmación y no es deshacible

- **WHEN** se elige eliminar una etiqueta
- **THEN** se pide confirmación explícita advirtiendo que la acción no se
  puede deshacer, y una vez confirmado el borrado, `Ctrl/Cmd+Z` no lo revierte
