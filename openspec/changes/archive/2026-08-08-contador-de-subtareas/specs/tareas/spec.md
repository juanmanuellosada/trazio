## ADDED Requirements

### Requirement: La fila muestra el progreso de sus subtareas directas

Una fila de tarea que tiene subtareas SHALL mostrar cuántas de sus subtareas **directas**
están completadas sobre el total, con el formato `completadas/total`. NUNCA SHALL contar
las subtareas de sus subtareas: el número SHALL corresponderse con lo que el control de
desplegar muestra al abrirse.

El contador SHALL mostrarse tanto con las subtareas plegadas como desplegadas. Una tarea
sin subtareas NUNCA SHALL mostrarlo.

El contador NUNCA SHALL formar parte del nombre accesible del título de la tarea: SHALL
renderizarse como hermano de ese control, nunca dentro. El conteo SHALL incorporarse a
la etiqueta accesible del control de desplegar subtareas, y el elemento visual del
contador SHALL quedar oculto para lectores de pantalla, para no anunciarse dos veces.

El contador NUNCA SHALL mostrarse en el modo panel.

#### Scenario: Una tarea con subtareas muestra su progreso

- **WHEN** una tarea tiene cinco subtareas directas y dos están completadas
- **THEN** su fila muestra `2/5`

#### Scenario: Solo cuenta las subtareas directas

- **WHEN** una tarea tiene tres subtareas directas, y una de ellas tiene a su vez cuatro
  subtareas propias
- **THEN** el contador de la tarea SHALL mostrar el total 3, NUNCA 7

#### Scenario: Una tarea sin subtareas no muestra contador

- **WHEN** una tarea no tiene ninguna subtarea
- **THEN** NUNCA SHALL mostrarse ningún contador en su fila

#### Scenario: El contador sigue visible al desplegar

- **WHEN** se despliegan las subtareas de una tarea que muestra `2/5`
- **THEN** el contador SHALL seguir visible

#### Scenario: El contador no cambia el nombre accesible del título

- **WHEN** se busca una tarea por su título accesible "Preparar la mudanza"
- **THEN** SHALL encontrarse con ese nombre exacto, sin el contador incorporado

#### Scenario: El control de desplegar anuncia el conteo

- **WHEN** un lector de pantalla llega al control de desplegar las subtareas de
  "Preparar la mudanza", que tiene cinco subtareas con dos completadas
- **THEN** ese control SHALL anunciar la cantidad de subtareas y cuántas están completadas

#### Scenario: Completar una subtarea actualiza el contador

- **WHEN** se completa una de las cinco subtareas de una tarea que mostraba `2/5`
- **THEN** el contador SHALL pasar a `3/5`

### Requirement: El detalle de tarea muestra el mismo contador

El detalle de una tarea con subtareas SHALL mostrar el mismo contador de subtareas
directas completadas sobre el total, con el mismo criterio de conteo que la fila.

#### Scenario: El detalle muestra el progreso de las subtareas

- **WHEN** se abre el detalle de una tarea con cinco subtareas, dos completadas
- **THEN** el detalle muestra `2/5` junto a la lista de subtareas
