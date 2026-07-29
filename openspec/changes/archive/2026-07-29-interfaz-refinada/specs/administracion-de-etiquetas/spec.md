## ADDED Requirements

### Requirement: Existe una pantalla propia para administrar etiquetas

La aplicación SHALL ofrecer una pantalla propia donde crear, renombrar, recolorear y eliminar las etiquetas del usuario.

#### Scenario: Crear una etiqueta nueva desde la pantalla de administración

- **WHEN** el usuario crea una etiqueta nueva desde la pantalla de administración
- **THEN** la etiqueta SHALL quedar disponible para asignarse a cualquier tarea

#### Scenario: Renombrar una etiqueta existente

- **WHEN** el usuario cambia el nombre de una etiqueta desde la pantalla de administración
- **THEN** el nuevo nombre SHALL reflejarse en todos los chips donde esa etiqueta ya estaba asignada

#### Scenario: Recolorear una etiqueta existente

- **WHEN** el usuario cambia el color de una etiqueta desde la pantalla de administración
- **THEN** el nuevo color SHALL reflejarse en todos los chips donde esa etiqueta ya estaba asignada

### Requirement: El color de la etiqueta usa el mismo selector que el color de proyecto

El selector de color de una etiqueta SHALL ser el mismo componente que el selector de color de un proyecto, con la misma paleta de diez colores con nombre y la misma opción de color personalizado validado por contraste.

#### Scenario: La paleta ofrecida es la misma que la de proyectos

- **WHEN** se abre el selector de color desde la pantalla de administración de etiquetas
- **THEN** SHALL ofrecerse la misma paleta de diez colores con nombre que el selector de color de proyecto

#### Scenario: El color personalizado se valida con el mismo criterio de contraste que en proyectos

- **WHEN** se elige un color personalizado para una etiqueta
- **THEN** SHALL aplicarse la misma validación de contraste que usa el selector de color de proyecto para un color personalizado
- **AND** un color que no cumple esa validación NUNCA SHALL guardarse como color de la etiqueta

### Requirement: El selector de etiquetas de una tarea permite buscar y elegir varias a la vez

El selector de etiquetas del detalle de una tarea SHALL ofrecer un campo de búsqueda que filtra las etiquetas existentes del usuario, y SHALL permitir marcar más de una etiqueta a la vez.

#### Scenario: Buscar filtra la lista de etiquetas por texto

- **WHEN** se escribe texto en el campo de búsqueda del selector de etiquetas de una tarea
- **THEN** la lista SHALL mostrar solo las etiquetas del usuario cuyo nombre coincide con ese texto

#### Scenario: Se pueden marcar varias etiquetas en la misma edición

- **WHEN** se abre el selector de etiquetas de una tarea
- **THEN** SHALL poder marcarse más de una etiqueta antes de guardar

#### Scenario: Guardar reemplaza el conjunto completo de etiquetas, no lo suma

- **WHEN** se guarda una edición hecha desde este selector
- **THEN** el conjunto de etiquetas asignadas a la tarea SHALL quedar reemplazado por el conjunto marcado en el selector, según el comportamiento de reemplazo ya establecido para la edición de etiquetas de una tarea
- **AND** el selector NUNCA SHALL ofrecer agregar o quitar una etiqueta de forma incremental por fuera de ese reemplazo

### Requirement: La eliminación de una etiqueta desde la administración exige confirmación

Antes de eliminar una etiqueta, la pantalla de administración SHALL pedir
confirmación al usuario: la eliminación no se puede deshacer y aplica en
cascada sobre las tareas asignadas, según el comportamiento ya establecido por
la capacidad `etiquetas` para eliminar una etiqueta.

#### Scenario: La confirmación de borrado antecede a la eliminación

- **WHEN** el usuario elige eliminar una etiqueta desde la pantalla de administración
- **THEN** el sistema SHALL pedir confirmación antes de eliminarla

### Requirement: La página propia por etiqueta y las etiquetas favoritas quedan fuera de esta capacidad

La página propia por etiqueta y la posibilidad de marcar una etiqueta como favorita MUST NOT implementarse como parte de esta capacidad.

#### Scenario: No existe una ruta que muestre todas las tareas de una etiqueta en particular

- **WHEN** se revisan las rutas de la aplicación que introduce esta capacidad
- **THEN** no SHALL existir una ruta que muestre todas las tareas de una etiqueta particular

#### Scenario: No hay ningún control para marcar una etiqueta como favorita

- **WHEN** se revisa la pantalla de administración de etiquetas
- **THEN** no SHALL existir ningún control para marcar una etiqueta como favorita
