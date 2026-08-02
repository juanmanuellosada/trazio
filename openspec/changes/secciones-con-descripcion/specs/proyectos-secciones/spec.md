## MODIFIED Requirements

### Requirement: Crear, renombrar, reordenar, colapsar y eliminar secciones

Dentro de un proyecto, SHALL poder crearse una sección con nombre y, opcionalmente, una
descripción. Una sección SHALL poder renombrarse, cambiarse su descripción, reordenarse
entre las demás secciones del mismo proyecto, colapsarse y expandirse, y eliminarse. Al
eliminar una sección, sus tareas NUNCA SHALL borrarse: quedan sin sección, dentro del
mismo proyecto.

El formulario de alta de una sección SHALL ofrecer los dos campos y SHALL exigir una
confirmación explícita: perder el foco de un campo NUNCA SHALL guardar la sección, porque
pasar del nombre a la descripción es justamente perder el foco. El formulario SHALL
ocupar el ancho de la columna de contenido.

La descripción de una sección SHALL mostrarse debajo de su nombre en el encabezado, y
cuando esté vacía NUNCA SHALL ocupar espacio. En la vista de tablero, donde la sección es
una columna angosta de encabezado de una línea, la descripción MUST NOT mostrarse.

#### Scenario: Crear una sección con nombre y descripción

- **WHEN** se completan el nombre y la descripción y se confirma
- **THEN** la sección existe con ambos, dentro de ese proyecto
- **AND** la descripción se muestra debajo del nombre en su encabezado

#### Scenario: Crear una sección solo con nombre

- **WHEN** se completa únicamente el nombre y se confirma
- **THEN** la sección existe sin descripción
- **AND** su encabezado NUNCA SHALL reservar espacio para una descripción vacía

#### Scenario: Pasar de un campo al otro no guarda la sección

- **WHEN** se escribe el nombre y se mueve el foco al campo de descripción
- **THEN** la sección NUNCA SHALL haberse creado todavía
- **AND** al cancelar, no queda ninguna sección nueva

#### Scenario: Crear y renombrar una sección

- **WHEN** se crea una sección con un nombre dentro de un proyecto, y luego se le
  cambia el nombre
- **THEN** la sección existe con el nombre más reciente, dentro de ese proyecto

#### Scenario: Cambiar la descripción de una sección existente

- **WHEN** se edita una sección y se cambia su descripción
- **THEN** el encabezado de esa sección muestra la descripción nueva

#### Scenario: La descripción no se muestra en la vista de tablero

- **WHEN** se mira en vista de tablero un proyecto cuyas secciones tienen descripción
- **THEN** las columnas SHALL mostrar el nombre de la sección
- **AND** NUNCA SHALL mostrar su descripción

#### Scenario: Colapsar y expandir una sección

- **WHEN** se colapsa una sección
- **THEN** sus tareas dejan de mostrarse pero siguen existiendo
- **WHEN** se la expande de nuevo
- **THEN** sus tareas vuelven a mostrarse

#### Scenario: Reordenar secciones dentro del mismo proyecto

- **WHEN** se cambia el orden de una sección respecto de las demás secciones del
  mismo proyecto
- **THEN** la sección queda en la nueva posición dentro de ese proyecto

#### Scenario: Eliminar una sección no borra sus tareas

- **WHEN** se elimina una sección que tiene tareas asignadas
- **THEN** la sección deja de existir
- **AND** esas tareas siguen existiendo, sin sección, dentro del mismo proyecto
