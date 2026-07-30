# comentarios Specification

## Purpose
TBD - created by archiving change fase-2-potencia. Update Purpose after archive.
## Requirements
### Requirement: Hilo de comentarios por tarea

Cada tarea SHALL tener su propio hilo de comentarios, alojado en el modal de
detalle de la tarea. Un comentario SHALL escribirse con el mismo editor Tiptap
enriquecido que usa la descripción de la tarea, con las mismas extensiones
fijadas por D31 (títulos, negrita, cursiva, tachado, código en línea, bloque de
código, regla horizontal, cita, resaltado, listas de tareas, tabla, notas al pie
y el bloque "destacado"). El editor de comentarios NUNCA SHALL ofrecer la
opción de fórmula matemática, igual que el editor de descripción (D30).

#### Scenario: Crear un comentario desde el modal de detalle

- **WHEN** se escribe y confirma un comentario en el hilo del modal de detalle
  de una tarea
- **THEN** el comentario queda creado y visible en el hilo, asociado a esa
  tarea

#### Scenario: El editor de comentarios no ofrece fórmula matemática

- **WHEN** se abre la barra de herramientas o el menú de insertar del editor de
  un comentario
- **THEN** ninguna opción de fórmula matemática está disponible

### Requirement: Un comentario editado se marca como "editado"

Un comentario SHALL poder editarse después de creado. Si `updated_at` difiere
de `created_at`, el comentario SHALL mostrarse marcado como "editado". Si
`updated_at` es igual a `created_at`, el comentario NUNCA SHALL mostrar esa
marca.

#### Scenario: Editar un comentario lo marca como editado

- **WHEN** se edita el contenido de un comentario ya creado
- **THEN** `updated_at` queda distinto de `created_at`
- **AND** el comentario se muestra con la marca "editado"

#### Scenario: Un comentario sin editar no muestra la marca

- **WHEN** se crea un comentario y no se lo modifica
- **THEN** `updated_at` es igual a `created_at`
- **AND** el comentario se muestra sin ninguna marca de "editado"

### Requirement: Eliminar un comentario

Un comentario SHALL poder eliminarse desde el hilo de la tarea.

#### Scenario: Eliminar un comentario lo quita del hilo

- **WHEN** se elimina un comentario del hilo de una tarea
- **THEN** ese comentario deja de mostrarse en el hilo

### Requirement: Comentarios sin adjuntos de archivos

Un comentario NUNCA SHALL permitir adjuntar archivos. Esta restricción es
permanente y no un límite temporal de esta fase.

#### Scenario: No existe ningún control para adjuntar un archivo

- **WHEN** se abre el editor de un comentario, en la barra de herramientas o en
  el menú de insertar
- **THEN** no existe ninguna opción para adjuntar un archivo

### Requirement: Comentarios en tiempo real entre pestañas y dispositivos

Un comentario creado, editado o eliminado en una pestaña o dispositivo SHALL
reflejarse casi al instante en el hilo abierto en otras pestañas o
dispositivos de la misma persona usuaria, vía realtime.

#### Scenario: Un comentario creado en otra pestaña aparece casi al instante

- **WHEN** se crea un comentario en el hilo de una tarea abierta en una
  pestaña
- **THEN** ese mismo hilo, abierto en otra pestaña o dispositivo, muestra el
  comentario nuevo casi de inmediato, sin recargar la página

### Requirement: Cascada de comentarios al eliminar y restaurar una tarea

Al eliminar una tarea, sus comentarios SHALL eliminarse en cascada junto con
ella. Al deshacer esa eliminación, los comentarios de la tarea SHALL
restaurarse junto con ella.

#### Scenario: Eliminar una tarea elimina sus comentarios

- **WHEN** se elimina una tarea que tiene comentarios en su hilo
- **THEN** esos comentarios se eliminan junto con la tarea

#### Scenario: Deshacer la eliminación restaura los comentarios

- **WHEN** se deshace la eliminación de una tarea que tenía comentarios
- **THEN** la tarea se restaura junto con todos los comentarios que tenía

