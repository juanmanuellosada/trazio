## MODIFIED Requirements

### Requirement: Ancho de contenido adaptativo en las vistas de lista

El ancho de la columna de contenido de las vistas de lista SHALL crecer junto
con el ancho de la ventana hasta un tope máximo, en vez de detenerse en un
ancho fijo angosto. La fecha, la prioridad y las etiquetas de una tarea SHALL
acompañar al título en vez de fijarse al borde derecho del contenedor.

El proyecto y la sección de una tarea SHALL ser la **única excepción**: cuando se muestran,
van anclados al borde derecho de la fila. La excepción se justifica porque no se leen en la
misma pasada que el título —se consultan cuando uno quiere saber de dónde viene la tarea— y
porque anclarlos alinea ese dato entre filas, que es lo que lo vuelve recorrible.

Por encima de un umbral de
ancho disponible, la columna de contenido SHALL centrarse en el espacio que
le queda al panel lateral, de forma que los márgenes se lean como aire; por
debajo de ese umbral, SHALL quedar alineada a la izquierda, pegada al panel
lateral, como hasta ahora. El valor concreto del tope máximo, el umbral de
centrado y el comportamiento intermedio los define la skill de diseño
`ui-ux-pro-max`; este requisito fija el comportamiento, no un número.

#### Scenario: El contenido usa más ancho en una pantalla amplia

- **WHEN** la ventana tiene un ancho de escritorio amplio
- **THEN** el ancho de la columna de contenido de la vista SHALL ser mayor
  que en una pantalla angosta, hasta el tope máximo definido por el sistema
  de diseño
- **AND** el ancho SHALL NOT quedar detenido en el valor fijo angosto
  anterior

#### Scenario: La fecha y las etiquetas acompañan al título

- **WHEN** se muestra una tarea con fecha y etiquetas en una pantalla ancha
- **THEN** SHALL mostrarse a una distancia acotada del título
- **AND** NUNCA SHALL mostrarse pegadas al borde derecho con un espacio vacío grande entre el
  título y ellas

#### Scenario: El proyecto sí se ancla al borde derecho

- **WHEN** se muestra una tarea en una vista que cruza proyectos, en una pantalla ancha
- **THEN** el proyecto y la sección SHALL mostrarse anclados al borde derecho de la fila
- **AND** SHALL quedar alineados con los de las demás filas

#### Scenario: El contenido se centra por encima del umbral de ancho

- **WHEN** el ancho disponible para la columna de contenido supera el
  umbral que define la skill de diseño
- **THEN** la columna de contenido se centra en el espacio disponible junto
  al panel lateral

## ADDED Requirements

### Requirement: La fila de tarea se organiza en niveles

La fila de una tarea SHALL organizarse en dos niveles: el título con el proyecto y la sección
anclados a la derecha, y debajo la fecha y las etiquetas.

Cada nivel SHALL renderizarse **solo si tiene contenido**. Una tarea sin fecha ni etiquetas
NUNCA SHALL reservar un renglón vacío: SHALL ocupar una sola línea.

#### Scenario: Una tarea con fecha y etiquetas ocupa dos niveles

- **WHEN** se muestra una tarea que tiene fecha y al menos una etiqueta
- **THEN** el título SHALL estar en un nivel y la fecha con las etiquetas en el siguiente

#### Scenario: Una tarea sin fecha ni etiquetas ocupa una sola línea

- **WHEN** se muestra una tarea sin fecha y sin etiquetas
- **THEN** SHALL ocupar una sola línea
- **AND** NUNCA SHALL dejar un renglón vacío debajo del título

### Requirement: El proyecto se muestra solo donde la vista cruza proyectos

El proyecto y la sección de una tarea SHALL mostrarse únicamente en las vistas cuyas tareas
pueden venir de proyectos distintos: Hoy, Próximos, la página de una etiqueta, la de un filtro,
el buscador y Completado.

NUNCA SHALL mostrarse en la Bandeja de entrada, en un proyecto, dentro de una sección ni en las
subtareas del detalle: ahí repetiría en cada fila lo que el encabezado ya dice.

Esta condición SHALL decidirse explícitamente en cada vista, y NUNCA SHALL derivarse del
tratamiento visual de la fila: hay vistas con el tratamiento compacto —el tablero de un
proyecto, y agrupar por prioridad dentro de un proyecto— donde el proyecto igual sobra.

#### Scenario: En Hoy se ve de qué proyecto es cada tarea

- **WHEN** el usuario mira Hoy, con tareas de proyectos distintos
- **THEN** cada fila SHALL mostrar su proyecto y, si la tiene, su sección

#### Scenario: Dentro de un proyecto no se repite el proyecto

- **WHEN** el usuario mira un proyecto
- **THEN** NUNCA SHALL mostrarse el proyecto en las filas

#### Scenario: Agrupar por prioridad dentro de un proyecto tampoco lo muestra

- **WHEN** el usuario agrupa por prioridad dentro de un proyecto, lo que cambia el tratamiento
  visual de la fila
- **THEN** NUNCA SHALL mostrarse el proyecto en las filas

### Requirement: Separación entre tareas y entre secciones

Las tareas hermanas de una lista SHALL separarse con una línea, y las secciones con una línea
**más marcada**, de modo que la jerarquía se lea sin esfuerzo.

NUNCA SHALL dibujarse una línea debajo de la última tarea de una lista, ni entre subtareas: en
el primer caso no separa nada, y en el segundo la sangría ya comunica el anidamiento y las
líneas harían parecer hermanas a tareas que no lo son.

#### Scenario: Las tareas de una lista se separan entre sí

- **WHEN** el usuario mira una lista con varias tareas
- **THEN** SHALL verse una línea entre una tarea y la siguiente

#### Scenario: La última tarea no lleva línea

- **WHEN** el usuario mira la última tarea de una lista
- **THEN** NUNCA SHALL dibujarse una línea debajo de ella

#### Scenario: Las subtareas no llevan línea

- **WHEN** el usuario expande una tarea con subtareas
- **THEN** NUNCA SHALL dibujarse líneas entre las subtareas

#### Scenario: La separación de sección se distingue de la de tarea

- **WHEN** el usuario mira una lista con secciones y tareas
- **THEN** la línea que separa secciones SHALL leerse como más marcada que la que separa tareas
