## MODIFIED Requirements

### Requirement: El modo panel está disponible en Bandeja, Proyecto y Próximos

El modo panel SHALL estar disponible como forma de ver alternativa a la lista en las vistas Bandeja de entrada, Proyecto, Próximos y **Hoy**. El modo calendario es una forma de ver aparte, definida por la capacidad `vista-calendario`, y no forma parte de esta capacidad.

En Hoy el panel SHALL mostrar únicamente tareas, según ya define la capacidad `hoy-con-eventos`.

#### Scenario: El selector de forma de ver ofrece panel en Bandeja

- **WHEN** el usuario abre la barra de opciones de vista en la Bandeja de entrada
- **THEN** el selector de forma de ver ofrece "panel" entre sus opciones

#### Scenario: El modo panel no existe en Etiqueta ni en Filtro

- **WHEN** el usuario abre la barra de opciones de vista en la página de una etiqueta o en la de un filtro
- **THEN** el selector de forma de ver no ofrece la opción "panel"

## REMOVED Requirements

### Requirement: Las columnas del panel son las secciones en Bandeja y Proyecto

**Motivo**: las columnas dejan de estar cableadas a la pantalla y pasan a salir del agrupador. El caso que este requisito describía sigue valiendo, pero como el valor "nada" del agrupador, no como una regla propia de Bandeja y Proyecto.

**Migración**: lo cubre el requisito "Las columnas del panel salen del agrupador".

### Requirement: Las columnas del panel son los días en Próximos

**Motivo**: mismo cambio. Los días pasan a ser lo que produce el agrupador en "nada" dentro de Próximos, o el valor "fecha" en cualquier pantalla.

**Migración**: lo cubre el requisito "Las columnas del panel salen del agrupador".

### Requirement: Arrastrar entre columnas cambia sección o fecha, pero no es la única forma

**Motivo**: mover ya no escribe solo sección o fecha, sino el campo que define las columnas, que ahora puede ser también prioridad o etiqueta.

**Migración**: lo cubre el requisito "Arrastrar entre columnas escribe el campo que las define", que conserva la garantía de D24 sobre no depender de un solo gesto.

### Requirement: El arrastre entre columnas solo está habilitado con orden manual y sin agrupación

**Motivo**: la condición se invierte. Es el agrupador el que define qué campo se escribe al mover, así que exigir que no haya agrupación dejaba el arrastre apagado justo cuando más significa.

**Migración**: lo cubre el requisito "El arrastre entre columnas está habilitado con cualquier agrupación", que mantiene la exigencia de orden manual para reordenar **dentro** de una columna.

## ADDED Requirements

### Requirement: Las columnas del panel salen del agrupador

Las columnas del modo panel SHALL salir del valor del control de agrupar por, y NUNCA SHALL estar cableadas a la pantalla.

Con el agrupador en "nada", las columnas SHALL ser la agrupación natural de la pantalla: las secciones en Bandeja de entrada y Proyecto, y los días de la ventana configurada en Próximos. NUNCA SHALL producirse una sola columna: un tablero de una columna no es un tablero.

Con los demás valores, las columnas SHALL ser: una por sección más "Sin sección"; una por día con tareas más "Sin fecha"; o las cuatro prioridades.

Agrupar por etiqueta NUNCA SHALL producir columnas: una tarea puede tener varias y aparecería repetida. La capacidad `opciones-de-vista` define que ese valor no se ofrece en panel y que una preferencia ya guardada se trata como "nada" sin pisarse.

Cuando no hay ninguna columna que mostrar, SHALL mostrarse un estado vacío, y NUNCA SHALL quedar la pantalla en blanco.

#### Scenario: Sin agrupar, un proyecto muestra sus secciones

- **WHEN** un proyecto tiene las secciones "En curso" y "Bloqueado", además de tareas sin sección, y el agrupador está en "nada"
- **THEN** el modo panel SHALL mostrar tres columnas: la de tareas sin sección, "En curso" y "Bloqueado"

#### Scenario: Agrupar por prioridad cambia las columnas

- **WHEN** el usuario está en modo panel de un proyecto y elige agrupar por prioridad
- **THEN** las columnas SHALL pasar a ser las cuatro prioridades
- **AND** NUNCA SHALL seguir mostrándose una columna por sección

#### Scenario: Sin agrupar, Próximos muestra sus días

- **WHEN** Próximos está en modo panel con la ventana por defecto de 7 días y el agrupador en "nada"
- **THEN** SHALL mostrar 7 columnas de día más la columna "Sin fecha"

#### Scenario: Sin columnas no queda la pantalla en blanco

- **WHEN** el agrupador produce cero columnas porque no hay ninguna tarea
- **THEN** SHALL mostrarse un estado vacío
- **AND** NUNCA SHALL quedar la pantalla en blanco

### Requirement: Arrastrar entre columnas escribe el campo que las define

Arrastrar una tarea entre columnas SHALL escribir el campo que define esas columnas: la sección, la fecha de vencimiento o la prioridad, según el agrupador activo. Los tres son de cardinalidad uno, de modo que mover SHALL significar una sola cosa.

Mover entre columnas de fecha NUNCA SHALL borrar la hora de la tarea: cambia el día, no el momento del día.

Mover entre columnas de sección NUNCA SHALL aceptar una sección de otro proyecto, que la base rechaza.

Por **D24**, arrastrar NUNCA SHALL ser la única forma de cambiar esos campos: todos SHALL seguir siendo alcanzables desde el detalle y desde el menú de la tarea.

#### Scenario: Mover entre columnas de prioridad cambia la prioridad

- **WHEN** el usuario arrastra una tarea de la columna "P3" a la columna "P1"
- **THEN** la prioridad de esa tarea SHALL pasar a ser P1

#### Scenario: Mover entre días conserva la hora

- **WHEN** el usuario arrastra una tarea con hora de un día a otro
- **THEN** la fecha SHALL cambiar al día de destino
- **AND** la hora NUNCA SHALL borrarse

### Requirement: El arrastre entre columnas está habilitado con cualquier agrupación

Arrastrar una tarea entre columnas SHALL estar habilitado con cualquier valor del agrupador, porque es el agrupador el que define qué campo se escribe al mover.

Reordenar **dentro** de una columna SHALL seguir requiriendo el orden manual, que es lo único que puede persistir una posición elegida a mano.

#### Scenario: Con agrupación por prioridad se puede arrastrar entre columnas

- **WHEN** el modo panel de un proyecto tiene activada la agrupación por prioridad
- **THEN** arrastrar una tarea de una columna a otra SHALL cambiarle la prioridad

#### Scenario: Reordenar dentro de una columna requiere orden manual

- **WHEN** el orden configurado no es manual
- **THEN** cambiar la posición de una tarea dentro de su columna NUNCA SHALL persistirse



### Requirement: La tarjeta arrastrada sigue al puntero fuera del tablero

La tarjeta que se está arrastrando SHALL seguir al puntero en toda la pantalla, y NUNCA SHALL recortarse ni desaparecer al salir del área del tablero.

Para eso SHALL dibujarse en una capa superpuesta, fuera de los contenedores que recortan por desbordamiento.

#### Scenario: La tarjeta sale del tablero y sigue visible

- **WHEN** el usuario arrastra una tarjeta más allá del borde del tablero
- **THEN** la tarjeta SHALL seguir visible y siguiendo al puntero

### Requirement: La tarjeta muestra dos líneas de título

La tarjeta del panel SHALL mostrar hasta dos líneas del título antes de recortarlo, en vez de una.

#### Scenario: Un título largo se lee en dos líneas

- **WHEN** una tarea tiene un título que no entra en el ancho de la columna
- **THEN** la tarjeta SHALL mostrar hasta dos líneas de ese título

### Requirement: El panel usa el ancho disponible de la pantalla

En la forma de ver "panel", el contenido SHALL ocupar el ancho disponible en vez de detenerse en el tope de la columna de contenido, de modo que entren más columnas en una pantalla ancha.

Esta es una excepción acotada a **D39**, que fija el centrado de la columna de contenido: las formas de ver "lista" y "calendario" NUNCA SHALL verse afectadas. Un tablero no es una línea de texto — cada columna tiene su propio ancho corto, y el tope solo limita cuántas se ven a la vez.

#### Scenario: En una pantalla ancha entran más columnas

- **WHEN** el usuario mira el modo panel en una pantalla más ancha que el tope de la columna de contenido
- **THEN** SHALL verse más columnas que las que entrarían dentro de ese tope

#### Scenario: La lista no cambia

- **WHEN** el usuario vuelve a la forma de ver "lista"
- **THEN** el contenido SHALL seguir respetando el tope y el centrado que fija D39

### Requirement: Cada columna ofrece agregar una tarea

Cada columna del panel SHALL ofrecer agregar una tarea, y esa alta SHALL llegar con el campo de la columna ya puesto: la sección si las columnas son secciones, la fecha si son fechas, la prioridad si son prioridades.

Una columna sin tareas SHALL explicar qué va a aparecer ahí y ofrecer esa acción, y NUNCA SHALL limitarse a decir que está vacía.

#### Scenario: Agregar una tarea desde una columna de sección

- **WHEN** el usuario agrega una tarea desde la columna "En curso"
- **THEN** la tarea SHALL crearse en la sección "En curso"

#### Scenario: Agregar una tarea desde una columna de prioridad

- **WHEN** el usuario agrega una tarea desde la columna "P1"
- **THEN** la tarea SHALL crearse con prioridad P1

### Requirement: El panel ofrece crear una sección cuando las columnas son secciones

El modo panel SHALL ofrecer crear una sección únicamente cuando las columnas son secciones, y NUNCA SHALL ofrecerlo con otro agrupador: en un tablero por prioridad, crear una sección no crea ninguna columna.

El atajo de teclado que crea una sección SHALL funcionar en modo panel cuando esa acción está disponible, y NUNCA SHALL quedar sin efecto en silencio.

#### Scenario: Crear una sección desde el panel

- **WHEN** el usuario está en el modo panel de un proyecto con el agrupador en "nada"
- **THEN** SHALL ver una acción para crear una sección
- **AND** al crearla SHALL aparecer como una columna nueva

#### Scenario: Agrupando por prioridad no se ofrece crear sección

- **WHEN** el usuario agrupa el panel por prioridad
- **THEN** NUNCA SHALL verse la acción de crear una sección
