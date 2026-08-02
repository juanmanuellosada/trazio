## MODIFIED Requirements

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
