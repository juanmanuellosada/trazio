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
quede con al menos un título.

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

#### Scenario: El detalle es pantalla completa en teléfono

- **WHEN** se abre el detalle de una tarea desde dentro de la app en una pantalla
  de teléfono
- **THEN** se muestra a pantalla completa, no como modal

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

### Requirement: Capacidades fuera de alcance de tareas en fase 1

En esta fase, una tarea NUNCA SHALL tener comentarios, NUNCA SHALL poder
configurarse un recordatorio, y la recurrencia NUNCA SHALL ejecutarse: si el
parser de lenguaje natural emite una regla RRULE, esta SHALL guardarse tal
cual en `recurrence_rule`, pero ningún proceso de la fase 1 SHALL leer esa
columna para generar la siguiente ocurrencia. Las vistas de tareas de esta
fase NUNCA SHALL ofrecer selección múltiple ni deshacer con `Ctrl/Cmd+Z`. De
etiquetas, quedan fuera de fase 1 la página de administración de etiquetas, la
página propia por etiqueta y las etiquetas favoritas (son de la capacidad
`etiquetas`); la relación entre una tarea y sus etiquetas sí es de fase 1.

#### Scenario: No hay comentarios en el detalle de una tarea

- **WHEN** se abre el detalle de una tarea en esta fase
- **THEN** no se ofrece ningún hilo de comentarios

#### Scenario: No hay forma de configurar un recordatorio

- **WHEN** se abre el detalle de una tarea en esta fase
- **THEN** no existe ningún control para agregarle un recordatorio

#### Scenario: recurrence_rule se guarda pero nada la ejecuta

- **WHEN** una tarea se crea con una regla de recurrencia emitida por el parser
  de lenguaje natural
- **THEN** el valor queda guardado en `tasks.recurrence_rule`
- **AND** al completar esa tarea no se genera automáticamente ninguna ocurrencia
  siguiente

#### Scenario: No hay selección múltiple ni deshacer con Ctrl/Cmd+Z

- **WHEN** se interactúa con cualquier vista de tareas de esta fase
- **THEN** no existe ninguna barra de selección múltiple de tareas
- **AND** presionar `Ctrl/Cmd+Z` no revierte ninguna acción sobre una tarea

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

