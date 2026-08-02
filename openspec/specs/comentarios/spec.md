# comentarios Specification

## Purpose
TBD - created by archiving change fase-2-potencia. Update Purpose after archive.
## Requirements
### Requirement: Hilo de comentarios por tarea

Cada tarea SHALL tener su propio hilo de comentarios, alojado en el modal de
detalle de la tarea. Un comentario SHALL escribirse como **texto plano**, en un campo
de texto simple. El editor de comentarios NUNCA SHALL ofrecer barra de herramientas,
menú de insertar, diálogo de enlaces ni ninguna opción de formato enriquecido. Los
saltos de línea que el usuario escriba SHALL respetarse al mostrar el comentario.

La descripción de la tarea NO se ve afectada: sigue usando el editor Tiptap enriquecido
con las extensiones de D31 y sin fórmula matemática (D30). La asimetría es intencional:
la descripción es el cuerpo de la tarea y el comentario es una nota al margen.

#### Scenario: Crear un comentario desde el modal de detalle

- **WHEN** se escribe y confirma un comentario en el hilo del modal de detalle
  de una tarea
- **THEN** el comentario queda creado y visible en el hilo, asociado a esa
  tarea

#### Scenario: El campo de comentario no ofrece controles de formato

- **WHEN** se abre el campo para escribir o editar un comentario
- **THEN** NUNCA SHALL mostrarse una barra de herramientas, un menú de insertar ni un
  diálogo de enlaces
- **AND** escribir sintaxis de markdown NUNCA SHALL convertirla en formato: queda como
  los caracteres que se escribieron

#### Scenario: Los saltos de línea se respetan

- **WHEN** se escribe un comentario con varios párrafos separados por saltos de línea
- **THEN** al mostrarlo SHALL conservarse esa separación en líneas

#### Scenario: La descripción de la tarea sigue siendo enriquecida

- **WHEN** se abre el editor de la descripción de una tarea
- **THEN** SHALL seguir ofreciendo el editor enriquecido con sus extensiones, sin verse
  afectado por el formato de los comentarios

#### Scenario: Un comentario escrito antes del cambio se sigue leyendo

- **WHEN** se abre una tarea que tenía comentarios escritos con el editor enriquecido
- **THEN** esos comentarios SHALL mostrarse como texto, conservando su contenido y sus
  saltos de línea
- **AND** el formato que tuvieran (negritas, títulos, listas, tablas) SHALL haberse
  perdido, sin romper la lectura del texto

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

