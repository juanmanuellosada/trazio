# tareas Specification

## Purpose
TBD - created by archiving change fase-1-base-usable. Update Purpose after archive.
## Requirements
### Requirement: Título de tarea en texto plano

El título de una tarea SHALL guardarse y mostrarse como texto plano. El título
NUNCA SHALL interpretar ni renderizar markdown, links ni ningún formato de texto
enriquecido.

#### Scenario: El título no interpreta markdown

- **WHEN** se crea o edita una tarea con un título que contiene sintaxis de
  markdown, por ejemplo `**urgente** revisar [link](https://ejemplo.com)`
- **THEN** el título se guarda y se muestra tal cual fue escrito, como texto
  plano, sin negrita, sin link clickeable y sin ningún otro formato aplicado

### Requirement: Ciclo de vida completo de una tarea

Una tarea SHALL poder crearse, editarse, completarse, descompletarse, duplicarse,
moverse de proyecto o sección, reordenarse, eliminarse, y SHALL poder copiarse su
enlace directo. La creación SHALL resolverse siempre a través del componente de
alta rico definido por la capacidad `alta-de-tareas` —con título, descripción y
accesos a fecha, prioridad, fecha límite y proyecto destino—: este requisito no
repite esos campos, solo exige que crear una tarea pase por ese componente y
quede con al menos un título. Completar una tarea que tiene `recurrence_rule`
SHALL además disparar la generación automática de su siguiente ocurrencia,
según la mecánica de herencia, ancla y fin de serie que define la capacidad
`tareas-recurrentes`; este requisito solo establece que ese disparo forma
parte del ciclo de vida de completar, no repite esa mecánica.

#### Scenario: Crear una tarea desde el componente de alta

- **WHEN** se confirma la creación de una tarea desde el componente de alta
  definido por `alta-de-tareas`, indicando al menos un título
- **THEN** la tarea queda creada, pendiente, en el proyecto de destino indicado
  (o en la Bandeja de entrada si no se indicó ninguno)

#### Scenario: Editar los campos de una tarea

- **WHEN** se edita el título, la descripción, la prioridad, la fecha de
  vencimiento, la duración estimada o la fecha límite de una tarea existente
- **THEN** la tarea queda actualizada con los nuevos valores

#### Scenario: Completar y descompletar una tarea

- **WHEN** se marca una tarea pendiente como completada
- **THEN** su `completed_at` deja de ser `null`
- **WHEN** se descompleta esa misma tarea
- **THEN** su `completed_at` vuelve a ser `null`

#### Scenario: Completar una tarea recurrente dispara la generación de la siguiente ocurrencia

- **WHEN** se completa una tarea que tiene `recurrence_rule`
- **THEN** además de quedar completada, se dispara la generación de su
  siguiente ocurrencia, según el comportamiento que define la capacidad
  `tareas-recurrentes`

#### Scenario: Mover una tarea de proyecto o de sección

- **WHEN** se mueve una tarea a otro proyecto, o a otra sección dentro del mismo
  proyecto
- **THEN** la tarea queda ubicada en el proyecto y la sección de destino

#### Scenario: Reordenar una tarea

- **WHEN** se cambia el orden de una tarea respecto de las demás tareas de su
  mismo contexto (misma sección o mismo nivel de subtareas)
- **THEN** la tarea queda en la nueva posición

#### Scenario: Eliminar una tarea

- **WHEN** se elimina una tarea que tiene subtareas
- **THEN** la tarea y todas sus subtareas se borran físicamente

#### Scenario: Copiar el enlace directo de una tarea

- **WHEN** se usa la acción "copiar enlace directo" sobre una tarea
- **THEN** se copia una URL que apunta a `app/(app)/tarea/[id]` con el `id` de esa
  tarea

### Requirement: Subtareas anidadas sin límite de niveles

Una tarea SHALL poder tener subtareas mediante `parent_id`, sin ningún límite en
la cantidad de niveles de anidamiento.

#### Scenario: Una subtarea de una subtarea es válida

- **WHEN** se crea una subtarea dentro de otra subtarea que ya tiene un padre
  (es decir, un tercer nivel de anidamiento de tareas)
- **THEN** la subtarea se crea sin ningún error de profundidad máxima

### Requirement: Atributos de la tarea en fase 1

Una tarea SHALL tener prioridad, con valores `1` (Urgente) a `4` (Baja) y
default `4`. Una tarea SHALL tener una fecha de vencimiento con hora opcional,
guardada en `due_date` (sin hora) o en `due_at` (con hora): estas dos columnas
SHALL ser excluyentes entre sí, nunca ambas con valor a la vez, garantizado por
un constraint de base de datos. Una tarea SHALL poder tener una duración
estimada en minutos, y una fecha límite (`deadline`) independiente de la fecha
de vencimiento. La descripción de una tarea SHALL guardarse como un documento
Tiptap en una columna `jsonb`.

#### Scenario: Prioridad por defecto

- **WHEN** se crea una tarea sin indicar prioridad
- **THEN** la tarea queda con prioridad `4` (Baja)

#### Scenario: due_date y due_at son excluyentes

- **WHEN** se intenta guardar una tarea con `due_date` y `due_at` con valor al
  mismo tiempo
- **THEN** la base de datos rechaza la operación por el constraint de exclusión

#### Scenario: Fecha de vencimiento sin hora

- **WHEN** se le pone a una tarea una fecha de vencimiento sin especificar hora
- **THEN** la fecha queda guardada en `due_date`, y `due_at` permanece `null`

#### Scenario: Fecha de vencimiento con hora

- **WHEN** se le pone a una tarea una fecha de vencimiento con una hora concreta
- **THEN** el momento queda guardado en `due_at`, y `due_date` permanece `null`

#### Scenario: Duración estimada y fecha límite son independientes de la fecha de vencimiento

- **WHEN** se le asigna a una tarea una duración estimada en minutos y una fecha
  límite (`deadline`) distinta de su fecha de vencimiento
- **THEN** ambos valores se guardan sin afectar ni ser afectados por `due_date` o
  `due_at`

#### Scenario: La descripción se guarda como documento Tiptap

- **WHEN** se edita la descripción de una tarea usando el editor enriquecido
- **THEN** el contenido se guarda en la columna `description` como un documento
  jsonb de Tiptap

### Requirement: Duplicar una tarea

Al duplicar una tarea, la copia SHALL incluir los campos propios de la tarea
original y SHALL incluir sus subtareas, copiadas recursivamente. La copia NUNCA
SHALL heredar `completed_at`: nace pendiente. La copia NUNCA SHALL heredar la
fecha de creación original. El título de la copia SHALL ser idéntico al de la
tarea original, sin ningún sufijo agregado (nunca "(copia)"). La copia SHALL
insertarse inmediatamente después de la tarea original en el orden de su
contexto.

#### Scenario: Duplicar copia los campos propios y las subtareas

- **WHEN** se duplica una tarea que tiene título, descripción, prioridad, fecha
  de vencimiento y dos subtareas
- **THEN** la copia tiene el mismo título, la misma descripción, la misma
  prioridad y la misma fecha de vencimiento
- **AND** la copia tiene dos subtareas propias, equivalentes a las de la
  original

#### Scenario: La copia nace pendiente y sin la fecha de creación original

- **WHEN** se duplica una tarea que ya estaba completada
- **THEN** la copia tiene `completed_at` en `null`
- **AND** la copia tiene su propia fecha de creación, distinta de la de la
  tarea original

#### Scenario: El título de la copia no lleva sufijo

- **WHEN** se duplica una tarea titulada "Pagar el alquiler"
- **THEN** el título de la copia es exactamente "Pagar el alquiler", sin ningún
  texto agregado como "(copia)"

#### Scenario: La copia se ubica inmediatamente después de la original

- **WHEN** se duplica una tarea que está en una posición determinada dentro de
  una sección
- **THEN** la copia queda ubicada justo después de la tarea original en el
  orden de esa sección

### Requirement: Ruta de una tarea suelta y detalle en la app

Una tarea SHALL tener una ruta propia en `app/(app)/tarea/[id]`, servida a
pantalla completa y con su propio `<title>` de documento. Esta ruta SHALL ser el
destino de "copiar enlace directo" y de "abrir en ventana aparte". Dentro de la
app, el detalle de una tarea SHALL mostrarse como un modal centrado por encima
de la pantalla, salvo en teléfono, donde SHALL mostrarse a pantalla completa. El
título y la descripción del detalle SHALL autoguardarse, sin requerir una
acción explícita de guardado.

En pantallas anchas, el detalle SHALL organizarse en dos columnas: a la izquierda lo que
el usuario escribe —título, descripción, subtareas y comentarios— y a la derecha lo que
el usuario elige —proyecto, fecha, fecha límite, prioridad, etiquetas, recordatorios y
repetición—. Cuando el ancho no alcanza para dos columnas, el detalle SHALL colapsar a
una sola, y ahí los atributos SHALL ubicarse después del título y **antes** de la
descripción, nunca al final: mandarlos al fondo obligaría a desplazarse hasta abajo para
cambiar una fecha.

El ancho del modal SHALL pedirse como una variante con nombre del componente de diálogo,
y NUNCA SHALL fijarse con una clase de ancho suelta en el detalle.

#### Scenario: La ruta de tarea suelta tiene su propio título de documento

- **WHEN** se navega directamente a `app/(app)/tarea/[id]` de una tarea
  determinada
- **THEN** la página se muestra a pantalla completa
- **AND** el `<title>` del documento corresponde a esa tarea

#### Scenario: Abrir en ventana aparte usa esa ruta

- **WHEN** se usa la acción "abrir en ventana aparte" sobre una tarea
- **THEN** se abre `app/(app)/tarea/[id]` con el `id` de esa tarea

#### Scenario: El detalle es un modal centrado en escritorio

- **WHEN** se abre el detalle de una tarea desde dentro de la app en una
  pantalla de escritorio
- **THEN** se muestra como un modal centrado por encima de la pantalla, sin
  ningún control para redimensionarlo

#### Scenario: En escritorio el contenido y los atributos están en columnas distintas

- **WHEN** se abre el detalle de una tarea en una pantalla ancha
- **THEN** el título, la descripción, las subtareas y los comentarios SHALL mostrarse en
  una columna
- **AND** el proyecto, la fecha, la fecha límite, la prioridad, las etiquetas, los
  recordatorios y la repetición SHALL mostrarse en la otra

#### Scenario: En ancho insuficiente colapsa a una columna con los atributos arriba

- **WHEN** el ancho disponible no alcanza para dos columnas
- **THEN** el detalle SHALL mostrarse en una sola columna
- **AND** los atributos SHALL aparecer después del título y antes de la descripción
- **AND** NUNCA SHALL quedar al final, después de los comentarios

#### Scenario: El detalle es pantalla completa en teléfono

- **WHEN** se abre el detalle de una tarea desde dentro de la app en una pantalla
  de teléfono
- **THEN** se muestra a pantalla completa, no como modal

#### Scenario: Los atajos del detalle siguen funcionando tras la reorganización

- **WHEN** se usan los atajos del detalle para fecha, fecha límite, prioridad,
  recordatorios, proyecto, etiquetas y subtareas
- **THEN** cada uno SHALL abrir el control que le corresponde, en cualquiera de las dos
  columnas donde haya quedado

#### Scenario: Título y descripción se autoguardan

- **WHEN** se edita el título o la descripción de una tarea desde el modal de
  detalle, sin usar ningún botón de guardar
- **THEN** el cambio queda persistido

### Requirement: Optimistic updates en completar, editar, mover y reordenar

Completar, descompletar, editar, mover y reordenar una tarea SHALL aplicarse de
forma optimista: el cambio SHALL verse reflejado en la interfaz de inmediato,
antes de recibir confirmación del servidor. Si el servidor rechaza la
operación, el cambio SHALL revertirse en la interfaz y SHALL mostrarse un aviso
de tres partes: qué pasó, por qué, y qué hacer.

#### Scenario: Completar se ve instantáneo

- **WHEN** se marca una tarea como completada
- **THEN** la interfaz la muestra completada de inmediato, sin esperar la
  respuesta del servidor

#### Scenario: El servidor rechaza y la interfaz revierte con un aviso de tres partes

- **WHEN** se completa, edita, mueve o reordena una tarea y el servidor rechaza
  esa operación
- **THEN** la interfaz revierte la tarea a su estado anterior
- **AND** se muestra un aviso que indica qué pasó, por qué pasó y qué hacer,
  sin exponer códigos técnicos ni culpar a quien usa la app

### Requirement: Relación entre una tarea y sus etiquetas

Una tarea SHALL poder tener cero o más etiquetas. Desde el detalle de una
tarea, el conjunto de etiquetas asignadas SHALL editarse reemplazando el
conjunto completo, no agregando o quitando una etiqueta a la vez contra el
servidor. El alta rápida de una tarea SHALL reconocer el símbolo `#` seguido
del nombre de una etiqueta y asignar esa etiqueta a la tarea creada. Esta
capacidad cubre únicamente la relación tarea-etiqueta; la creación, edición,
color y administración de las etiquetas en sí son de la capacidad `etiquetas`.

#### Scenario: Editar etiquetas desde el detalle reemplaza el conjunto completo

- **WHEN** se guarda un cambio en el conjunto de etiquetas de una tarea desde
  su detalle
- **THEN** la tarea queda con exactamente el conjunto de etiquetas indicado,
  reemplazando el conjunto anterior

#### Scenario: El alta rápida asigna etiquetas con el símbolo #

- **WHEN** se crea una tarea desde el alta rápida con un texto que incluye
  `#nombre-etiqueta`
- **THEN** la tarea creada queda con esa etiqueta asignada

### Requirement: Selector de proyecto en el detalle de una tarea

El detalle de una tarea SHALL ofrecer un selector de proyecto, precargado
con el proyecto donde se creó la tarea (o vacío si es de la Bandeja de
entrada) y editable en cualquier momento. Al abrirse, SHALL desplegar todos
los proyectos de la persona usuaria con sus secciones anidadas, para poder
mover la tarea directamente a una sección desde cualquier punto de la app.
Elegir un destino desde este selector SHALL mover la tarea a ese proyecto o
sección, sujeto al mismo trigger de base de datos que ya valida que el
proyecto y la sección destino pertenezcan a la misma persona usuaria que la
tarea. Cuando la cantidad de proyectos y secciones sea grande, el selector
SHALL ofrecer búsqueda para encontrar el destino sin recorrer la lista
completa.

#### Scenario: El selector precarga el proyecto de origen

- **WHEN** se abre el detalle de una tarea que pertenece a un proyecto
- **THEN** el selector de proyecto del detalle muestra precargado ese
  proyecto

#### Scenario: El selector despliega todos los proyectos con sus secciones anidadas

- **WHEN** se abre el selector de proyecto desde el detalle de una tarea
- **THEN** se muestran todos los proyectos de la persona usuaria, cada uno
  con sus secciones anidadas debajo

#### Scenario: Elegir un destino mueve la tarea

- **WHEN** se elige un proyecto o una sección distinta desde el selector de
  proyecto del detalle
- **THEN** la tarea queda movida a ese proyecto o sección

#### Scenario: El trigger de base de datos sigue validando la pertenencia

- **WHEN** se intenta mover, desde este selector, una tarea a un proyecto o
  una sección que no pertenece a la misma persona usuaria que la tarea
- **THEN** el trigger de base de datos que ya valida esa pertenencia rechaza
  la operación

#### Scenario: Con muchos proyectos y secciones, el selector ofrece búsqueda

- **WHEN** la persona usuaria tiene una cantidad grande de proyectos y
  secciones
- **THEN** el selector de proyecto del detalle ofrece un campo de búsqueda
  para encontrar el destino sin recorrer la lista completa

### Requirement: Una tarea tiene un hilo de comentarios y cero o más recordatorios, ambos en cascada

Una tarea SHALL poder tener un hilo de comentarios (tabla `comments`) y cero
o más recordatorios (tabla `reminders`), ambos asociados por `task_id`. Al
eliminar una tarea, SHALL eliminarse en cascada todos sus comentarios y todos
sus recordatorios.

#### Scenario: Una tarea nueva no tiene comentarios ni recordatorios

- **WHEN** se crea una tarea nueva
- **THEN** nace sin ningún comentario y sin ningún recordatorio, ambos opcionales

#### Scenario: Eliminar una tarea elimina sus comentarios en cascada

- **WHEN** se elimina una tarea que tiene comentarios en su hilo
- **THEN** todos esos comentarios se eliminan junto con la tarea

#### Scenario: Eliminar una tarea elimina sus recordatorios en cascada

- **WHEN** se elimina una tarea que tiene recordatorios configurados
- **THEN** todos esos recordatorios se eliminan junto con la tarea

### Requirement: Abrir el detalle deja una entrada en el historial

Abrir el detalle de una tarea dentro de la aplicación SHALL agregar una entrada al
historial de navegación. Volver atrás SHALL cerrar el detalle y dejar al usuario donde
estaba, y NUNCA SHALL sacarlo de la aplicación.

Cerrar el detalle por cualquier otra vía —el botón de cerrar, `Escape`, o hacer clic
fuera— SHALL dejar el historial en el mismo estado que si se hubiera vuelto atrás: NUNCA
SHALL acumular entradas que después hagan que volver atrás no produzca ningún efecto
visible.

Abrir una tarea desde el detalle de otra SHALL encadenar entradas, de modo que volver atrás
devuelva al detalle anterior.

#### Scenario: Volver atrás cierra el detalle

- **WHEN** el usuario abre el detalle de una tarea y usa el botón de volver atrás del
  navegador
- **THEN** el detalle SHALL cerrarse
- **AND** el usuario SHALL quedar en la vista desde la que lo abrió

#### Scenario: Volver atrás desde una subtarea abierta desde su padre

- **WHEN** el usuario abre el detalle de una tarea, desde ahí abre el detalle de una de sus
  subtareas, y vuelve atrás
- **THEN** SHALL volver al detalle de la tarea padre

#### Scenario: Cerrar con el botón no deja entradas muertas

- **WHEN** el usuario abre y cierra el detalle con el botón de cerrar, y repite eso varias
  veces, y después vuelve atrás
- **THEN** volver atrás SHALL producir un efecto visible
- **AND** NUNCA SHALL requerir volver atrás varias veces para salir de la vista

#### Scenario: Cerrar con Escape se comporta igual

- **WHEN** el usuario abre el detalle y lo cierra con `Escape`
- **THEN** el historial SHALL quedar como si hubiera vuelto atrás

### Requirement: El detalle de una subtarea muestra su tarea padre

El detalle de una tarea que tiene padre SHALL mostrar cuál es esa tarea padre y SHALL
permitir abrirla desde ahí. El detalle de una tarea sin padre NUNCA SHALL mostrar ese
acceso.

Se muestra el **padre directo**. El detalle NUNCA SHALL dibujar la cadena completa de
ancestros: las subtareas no tienen límite de anidamiento y esa cadena puede ser larga e
impredecible.

#### Scenario: Una subtarea muestra su padre

- **WHEN** el usuario abre el detalle de una subtarea
- **THEN** SHALL verse cuál es su tarea padre

#### Scenario: Abrir el padre desde la subtarea

- **WHEN** el usuario usa ese acceso desde el detalle de una subtarea
- **THEN** SHALL abrirse el detalle de la tarea padre
- **AND** volver atrás SHALL devolver al detalle de la subtarea

#### Scenario: Una tarea de primer nivel no muestra ningún padre

- **WHEN** el usuario abre el detalle de una tarea que no es subtarea de ninguna
- **THEN** NUNCA SHALL mostrarse un acceso a una tarea padre

#### Scenario: Una subtarea anidada muestra solo su padre directo

- **WHEN** el usuario abre el detalle de una subtarea que a su vez cuelga de otra subtarea
- **THEN** SHALL mostrarse únicamente su padre directo
- **AND** NUNCA SHALL mostrarse la cadena completa de ancestros

### Requirement: Menú de acciones de una tarea, por clic derecho y por botón

Cada tarea SHALL ofrecer un menú de acciones que SHALL abrirse tanto con **clic derecho
sobre la fila** como desde su botón de acciones. Las dos entradas SHALL abrir el **mismo**
menú: NUNCA SHALL existir una lista de acciones para el clic derecho y otra distinta para
el botón.

El clic derecho SHALL seguir mostrando el menú del navegador cuando el usuario lo hace
sobre un enlace, sobre texto seleccionado o dentro de un campo de edición.

#### Scenario: El clic derecho sobre una tarea abre su menú

- **WHEN** el usuario hace clic derecho sobre una fila de tarea
- **THEN** SHALL abrirse el menú de acciones de esa tarea
- **AND** NUNCA SHALL aparecer el menú del navegador

#### Scenario: Las dos entradas abren lo mismo

- **WHEN** se compara el menú abierto con clic derecho con el abierto desde el botón de
  acciones de la misma tarea
- **THEN** SHALL ofrecer las mismas acciones

#### Scenario: El clic derecho sobre un campo de edición no se secuestra

- **WHEN** el usuario hace clic derecho dentro de un campo de texto editable de la fila, o
  sobre texto que tiene seleccionado
- **THEN** SHALL aparecer el menú del navegador
- **AND** NUNCA SHALL abrirse el menú de la tarea

### Requirement: El menú resuelve fecha y prioridad sin abrir el detalle

El menú de acciones SHALL permitir cambiar la fecha y la prioridad de la tarea **desde el
propio menú**, sin abrir el detalle. Para la fecha SHALL ofrecer los accesos rápidos, la
opción de quitarla y la de abrir el selector completo; para la prioridad, las cuatro.

El menú SHALL ofrecer además fecha límite y recordatorios, delegando en sus selectores.

#### Scenario: Poner una fecha rápida desde el menú

- **WHEN** el usuario elige un acceso rápido de fecha desde el menú de una tarea
- **THEN** la tarea SHALL quedar con esa fecha
- **AND** NUNCA SHALL abrirse el detalle para lograrlo

#### Scenario: Quitar la fecha desde el menú

- **WHEN** el usuario elige quitar la fecha desde el menú de una tarea que tenía una
- **THEN** la tarea SHALL quedar sin fecha

#### Scenario: Abrir el selector completo de fecha desde el menú

- **WHEN** el usuario elige la opción de ver más fechas
- **THEN** SHALL abrirse el selector de fecha completo

#### Scenario: Cambiar la prioridad desde el menú

- **WHEN** el usuario elige una de las cuatro prioridades desde el menú
- **THEN** la tarea SHALL quedar con esa prioridad
- **AND** NUNCA SHALL abrirse el detalle para lograrlo

### Requirement: Agregar una tarea encima o debajo desde el menú

El menú de acciones SHALL ofrecer agregar una tarea inmediatamente encima o inmediatamente
debajo de la tarea de referencia. Esas altas SHALL resolverse con el componente de alta
compartido, y NUNCA SHALL tener implementación propia.

La tarea nueva SHALL heredar el contexto de la de referencia: su proyecto, su sección y su
tarea padre si la tuviera.

#### Scenario: Agregar una tarea debajo

- **WHEN** el usuario elige agregar una tarea debajo y confirma el alta
- **THEN** la tarea nueva SHALL quedar inmediatamente después de la de referencia
- **AND** SHALL quedar en el mismo proyecto y la misma sección

#### Scenario: Agregar una tarea encima

- **WHEN** el usuario elige agregar una tarea encima y confirma el alta
- **THEN** la tarea nueva SHALL quedar inmediatamente antes de la de referencia

#### Scenario: Agregar debajo de una subtarea crea otra subtarea

- **WHEN** la tarea de referencia es una subtarea
- **THEN** la tarea nueva SHALL quedar como subtarea del mismo padre
- **AND** el alta NUNCA SHALL mostrar selector de destino, según la regla de subtareas de
  `alta-de-tareas`

### Requirement: El detalle ofrece abrir la tarea completa en la misma ventana

El menú de acciones del detalle de una tarea SHALL ofrecer abrir esa tarea a pantalla
completa **en la misma ventana**, navegando a su ruta propia. Esa acción SHALL convivir con la
de abrirla en una ventana aparte: son cosas distintas y las dos SHALL seguir disponibles.

#### Scenario: Abrir completo en esta ventana

- **WHEN** el usuario elige abrir la tarea completa en esta ventana desde el menú del detalle
- **THEN** la aplicación SHALL navegar a la ruta propia de esa tarea
- **AND** NUNCA SHALL abrirse una ventana ni una pestaña nueva

#### Scenario: Abrir en ventana aparte sigue existiendo

- **WHEN** el usuario abre el menú de acciones del detalle
- **THEN** SHALL ofrecerse tanto abrir en esta ventana como abrir en una ventana aparte

