## ADDED Requirements

### Requirement: Copiar un proyecto como markdown

El menú de acciones de un proyecto SHALL ofrecer "Copiar como markdown",
junto a editar, duplicar, compartir, archivar y eliminar. La Bandeja de
entrada NUNCA SHALL ofrecerlo.

La acción SHALL dejar en el portapapeles el proyecto serializado en
markdown: nombre y descripción del proyecto; cada sección con su
descripción; las tareas y subtareas, anidadas; la descripción de cada tarea;
y por tarea su fecha de vencimiento, prioridad (solo si no es la default),
duración estimada y etiquetas. Una tarea o subtarea completada SHALL
marcarse `- [x]`; una pendiente, `- [ ]`.

La estructura SHALL ser siempre la canónica: primero las tareas sin
sección, después cada sección por su posición, subtareas anidadas por
posición. NUNCA SHALL depender de los filtros rápidos, el agrupador ni el
orden que tenga puestos la barra de opciones de vista.

Si falla la consulta que trae las descripciones de las tareas, la acción
NUNCA SHALL copiar un resultado parcial o incorrecto: SHALL avisar que no
se pudo copiar el proyecto. Si el navegador niega el acceso al portapapeles,
SHALL avisar eso en particular, distinto del error anterior.

#### Scenario: Copiar un proyecto con secciones y subtareas

- **WHEN** se copia como markdown un proyecto con dos secciones, tareas con
  subtareas y alguna tarea completada
- **THEN** el portapapeles SHALL recibir el proyecto con sus secciones por
  posición, las tareas sin sección primero, las subtareas anidadas por
  posición, y las tareas completadas marcadas `- [x]`

#### Scenario: Un proyecto vacío se copia igual

- **WHEN** se copia como markdown un proyecto sin secciones y sin tareas
- **THEN** el portapapeles SHALL recibir el nombre y la descripción del
  proyecto, sin error

#### Scenario: La Bandeja de entrada no ofrece la acción

- **WHEN** se abre el menú de acciones de la Bandeja de entrada
- **THEN** NUNCA SHALL ofrecerse "Copiar como markdown"

#### Scenario: Falla la red al traer las descripciones

- **WHEN** se copia como markdown un proyecto y la consulta de descripciones
  de las tareas falla
- **THEN** NUNCA SHALL copiarse nada al portapapeles
- **AND** SHALL avisarse que no se pudo copiar el proyecto por un problema
  de datos

#### Scenario: El navegador niega el portapapeles

- **WHEN** se copia como markdown un proyecto y el navegador rechaza la
  escritura al portapapeles
- **THEN** SHALL avisarse que no se pudo usar el portapapeles, distinto del
  aviso de un problema de datos

#### Scenario: El resultado no depende de filtros ni agrupador

- **WHEN** se copia como markdown un proyecto con un filtro rápido activo y
  agrupado por un valor distinto de "Sección"
- **THEN** el resultado SHALL seguir la estructura canónica por sección y
  posición, sin excluir ni reordenar nada por el filtro o el agrupador
