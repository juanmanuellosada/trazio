## MODIFIED Requirements

### Requirement: Vista Proyecto

La vista Proyecto SHALL mostrar sus tareas según el agrupador activo. Agrupada por sección —su valor por defecto— SHALL mostrar primero las tareas que no pertenecen a ninguna sección, y después cada sección como un bloque colapsable, cada uno con su propio botón para agregar una tarea dentro de esa sección.

Con cualquier otro agrupador, incluida la opción de no agrupar, la vista SHALL mostrar las tareas sin los bloques de sección. En ese caso las acciones que viven en el encabezado de una sección —renombrarla, eliminarla, crear una nueva— SHALL seguir siendo alcanzables desde otro lado, según exige **D24**. Colapsar SHALL poder perderse, porque es una comodidad de lectura y no una acción sobre los datos.

#### Scenario: Orden dentro de un proyecto agrupado por sección

- **WHEN** el usuario abre la vista de un proyecto que tiene tareas sin sección y al menos una sección con tareas
- **THEN** la vista muestra primero el bloque de tareas sin sección
- **AND** después muestra cada sección como un bloque colapsable
- **AND** cada sección tiene su propio botón para agregar una tarea dentro de ella

#### Scenario: Un proyecto sin agrupar se ve como una lista corrida

- **WHEN** el usuario elige no agrupar en un proyecto con secciones
- **THEN** SHALL ver una sola lista corrida
- **AND** NUNCA SHALL verse un encabezado de sección

#### Scenario: Administrar secciones sigue siendo posible sin los bloques

- **WHEN** el usuario está en un proyecto con un agrupador distinto de sección
- **THEN** crear, renombrar y eliminar una sección SHALL seguir siendo alcanzable

## ADDED Requirements

### Requirement: La lista de Hoy no se agrupa

La lista de Hoy NUNCA SHALL ofrecer el control de agrupar por: dejó de ser una lista de tareas y pasó a ser una secuencia ordenada por hora con eventos intercalados, que define la capacidad `hoy-con-eventos`.

Agrupar romperia esa secuencia, y además los eventos no tienen prioridad, ni etiqueta, ni sección por las que agruparlos.

El panel de Hoy SHALL seguir ofreciendo el agrupador, porque ahí no hay eventos ni secuencia que romper.

#### Scenario: Hoy en lista no ofrece agrupar

- **WHEN** el usuario abre la barra de opciones de Hoy en la forma de ver "lista"
- **THEN** NUNCA SHALL ver el control de agrupar por

#### Scenario: Hoy en panel sí ofrece agrupar

- **WHEN** el usuario abre la barra de opciones de Hoy en la forma de ver "panel"
- **THEN** SHALL ver el control de agrupar por
