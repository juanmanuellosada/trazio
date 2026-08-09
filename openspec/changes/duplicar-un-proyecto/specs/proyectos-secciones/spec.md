## ADDED Requirements

### Requirement: Duplicar un proyecto

El menú de acciones de un proyecto SHALL ofrecer duplicarlo, junto a editar, archivar y eliminar. La Bandeja de entrada NUNCA SHALL ofrecerlo, igual que no ofrece editar, archivar ni eliminar.

La copia SHALL incluir el nombre con un sufijo que la distinga del original, el color, el ícono, la descripción, la vista preferida, todas sus secciones con su descripción, y todas sus tareas pendientes con sus subtareas y sus etiquetas.

La copia NUNCA SHALL incluir tareas completadas, comentarios, recordatorios, ni el estado de favorito o archivado.

Las fechas SHALL copiarse sin modificar: duplicar deja una copia igual. NUNCA SHALL limpiarse ni desplazarse — eso sería una plantilla, que es otra función.

Los subproyectos del proyecto duplicado NUNCA SHALL copiarse: se duplica el proyecto elegido, no su árbol.

La copia SHALL quedar junto al original en el árbol de proyectos y SHALL abrirse al terminar.

#### Scenario: Duplicar copia estructura y tareas

- **WHEN** se duplica un proyecto con dos secciones y cinco tareas pendientes, una de ellas con subtareas y etiquetas
- **THEN** SHALL crearse un proyecto nuevo con las dos secciones, las cinco tareas, sus subtareas y sus etiquetas

#### Scenario: Las completadas no se copian

- **WHEN** se duplica un proyecto que tiene tareas completadas
- **THEN** la copia NUNCA SHALL incluirlas

#### Scenario: Los recordatorios no se copian

- **WHEN** se duplica un proyecto cuyas tareas tienen recordatorios
- **THEN** la copia NUNCA SHALL incluirlos, para no disparar avisos duplicados

#### Scenario: Las fechas quedan igual

- **WHEN** se duplica un proyecto con tareas que vencen en fechas concretas
- **THEN** las copias SHALL tener las mismas fechas

#### Scenario: Los subproyectos no se arrastran

- **WHEN** se duplica un proyecto que tiene dos subproyectos
- **THEN** SHALL copiarse únicamente el proyecto elegido

#### Scenario: La Bandeja no se puede duplicar

- **WHEN** se abre el menú de acciones de la Bandeja de entrada
- **THEN** NUNCA SHALL ofrecerse duplicar
