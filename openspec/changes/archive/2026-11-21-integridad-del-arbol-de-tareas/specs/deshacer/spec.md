## ADDED Requirements

### Requirement: Restaurar una tarea eliminada restaura sus recordatorios

Deshacer la eliminación de una tarea SHALL restaurar los recordatorios de la
tarea y de sus subtareas, con su momento de aviso y su estado de entrega.

#### Scenario: Restaurar una tarea con recordatorios

- **WHEN** se elimina una tarea que tiene 2 recordatorios y luego se deshace
- **THEN** la tarea se restaura con sus 2 recordatorios

### Requirement: Una restauración parcial se informa

El sistema SHALL informar el error cuando, al restaurar una tarea eliminada,
falle la recuperación de sus etiquetas, sus comentarios o sus recordatorios, y
SHALL intentar recuperar los demás igualmente.

#### Scenario: Falla la recuperación de etiquetas

- **WHEN** se deshace la eliminación de una tarea con etiquetas, comentarios y
  recordatorios, y la base rechaza la inserción de las etiquetas
- **THEN** la tarea se restaura con sus comentarios y sus recordatorios
- **AND** la interfaz muestra un error
