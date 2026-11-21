## ADDED Requirements

### Requirement: Reemplazar las etiquetas nunca quita las que se conservan

Al reemplazar el conjunto de etiquetas de una tarea, el sistema SHALL asignar
primero las etiquetas nuevas y recién después quitar las que ya no
corresponden. Una falla en cualquiera de los dos pasos NUNCA SHALL dejar a la
tarea sin una etiqueta que estaba antes y sigue en el conjunto nuevo.

#### Scenario: Falla la asignación de una etiqueta nueva

- **WHEN** una tarea tiene `compras` y `urgente`, se guarda el conjunto
  `compras` y `casa`, y la base rechaza la asignación de `casa`
- **THEN** la tarea conserva `compras` y `urgente`
- **AND** la interfaz muestra un error

#### Scenario: Reemplazo sin fallas

- **WHEN** una tarea tiene `compras` y `urgente` y se guarda el conjunto
  `compras` y `casa`
- **THEN** la tarea queda con exactamente `compras` y `casa`
