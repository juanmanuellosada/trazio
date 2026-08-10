# proyectos-secciones Specification

## Purpose
TBD - created by archiving change fase-1-base-usable. Update Purpose after archive.
## Requirements
### Requirement: Crear y editar un proyecto

Toda cuenta SHALL poder crear un proyecto con nombre, y SHALL poder editar en
cualquier momento su nombre, color, ícono y descripción. El color SHALL
elegirse de una lista desplegable con el nombre y la muestra de cada color de
la paleta fija de proyecto —la misma paleta de diez colores, validada con un
check constraint en base de datos y con el mismo esquema de Zod compartido
desde `lib/validation/`—, que SHALL seguir siendo el camino principal y la
primera opción ofrecida. Al final de esa lista SHALL ofrecerse una opción de
color personalizado, como salida y no como reemplazo de la paleta: un color
personalizado SHALL validarse por contraste contra el fondo de superficie del
tema claro y contra el del tema oscuro antes de guardarse, y MUST NOT
aceptarse ningún color personalizado cuyo contraste no alcance el mínimo de
accesibilidad en cualquiera de los dos temas. El ícono SHALL elegirse con un
selector de emojis que ofrece todos los emojis, categorizados y buscables, en
vez de un campo donde se escribe el emoji. Al crear un proyecto, SHALL poder
elegirse también su proyecto padre —"sin padre" como valor por defecto,
respetando el máximo de tres niveles que ya impone la base de datos— y SHALL
poder marcarse como favorito desde la misma alta.

#### Scenario: Crear un proyecto con los campos básicos

- **WHEN** una persona crea un proyecto nuevo indicando nombre, color de la
  paleta y un emoji como ícono, sin elegir proyecto padre ni marcarlo como
  favorito
- **THEN** el proyecto se guarda con esos valores, sin proyecto padre (nivel
  superior), sin marcar como favorito, y con una descripción vacía por defecto

#### Scenario: Elegir un color de la paleta desde la lista desplegable

- **WHEN** se abre el selector de color al crear o editar un proyecto
- **THEN** se muestra una lista desplegable con el nombre y la muestra de cada
  uno de los diez colores de la paleta, y al final una opción de color
  personalizado

#### Scenario: Un color personalizado que no da contraste se rechaza

- **WHEN** se elige la opción de color personalizado y se indica un color cuyo
  contraste contra el fondo de superficie del tema claro o del tema oscuro no
  alcanza el mínimo de accesibilidad
- **THEN** ese color se rechaza
- **AND** el proyecto no se guarda con ese color

#### Scenario: Elegir el ícono con el selector de emojis

- **WHEN** se abre el selector de ícono al crear o editar un proyecto
- **THEN** se ofrecen todos los emojis, organizados por categoría y con una
  búsqueda para encontrarlos por nombre

#### Scenario: Elegir proyecto padre al crear, con "sin padre" por defecto

- **WHEN** se crea un proyecto sin elegir explícitamente ningún proyecto padre
- **THEN** el proyecto se crea sin padre, como proyecto de primer nivel
- **WHEN** se elige un proyecto existente como padre durante la creación
- **THEN** el proyecto se crea anidado bajo ese padre, respetando el máximo de
  tres niveles de la capacidad `proyectos-secciones`

#### Scenario: Marcar favorito desde el alta

- **WHEN** se marca la opción de favorito al crear un proyecto
- **THEN** el proyecto queda creado y marcado como favorito desde el momento de
  su creación

#### Scenario: Editar nombre, color, ícono y descripción

- **WHEN** se edita un proyecto existente cambiando su nombre, su color, su
  ícono o su descripción
- **THEN** el proyecto queda actualizado con los nuevos valores
- **AND** el resto de sus campos no cambia

#### Scenario: Un identificador de color inválido se rechaza

- **WHEN** se intenta crear o editar un proyecto con un valor de color que no
  es ninguno de los diez identificadores de la paleta ni un color
  personalizado con formato válido
- **THEN** la operación se rechaza tanto en la validación de Zod como en el
  check constraint de la base de datos

### Requirement: Anidamiento de proyectos hasta tres niveles

Un proyecto SHALL poder anidarse dentro de otro mediante `parent_id`, hasta un
máximo de **tres niveles** de profundidad. Un constraint o trigger en base de
datos SHALL impedir crear un cuarto nivel, y otro SHALL impedir que un proyecto
sea su propio ancestro.

#### Scenario: Anidar hasta el tercer nivel funciona

- **WHEN** se crea un proyecto hijo de un proyecto que ya tiene un padre (es decir,
  un proyecto de segundo nivel)
- **THEN** el proyecto hijo se crea como tercer nivel sin error

#### Scenario: Un cuarto nivel se rechaza

- **WHEN** se intenta crear un proyecto hijo de un proyecto que ya está en el
  tercer nivel de anidamiento
- **THEN** la base de datos rechaza la operación

#### Scenario: Un proyecto no puede ser su propio ancestro

- **WHEN** se intenta asignar como `parent_id` de un proyecto a sí mismo o a uno
  de sus propios descendientes
- **THEN** la base de datos rechaza la operación

### Requirement: Favoritos, archivado y eliminación de proyectos

Un proyecto SHALL poder marcarse y desmarcarse como favorito. Un proyecto SHALL
poder archivarse, dejando de mostrarse en la navegación cotidiana sin perder
ninguno de sus datos. Un proyecto SHALL poder eliminarse; la eliminación SHALL
pedir confirmación explícita que muestra la cantidad exacta de tareas que se van
a perder, SHALL borrar en cascada sus secciones y todas sus tareas (incluidas las
subtareas), y esta operación NUNCA SHALL ser reversible.

#### Scenario: Marcar y desmarcar un proyecto como favorito

- **WHEN** se marca un proyecto como favorito
- **THEN** aparece destacado entre los favoritos del panel lateral
- **WHEN** se lo desmarca
- **THEN** deja de aparecer ahí

#### Scenario: Archivar conserva los datos

- **WHEN** se archiva un proyecto que tiene secciones y tareas
- **THEN** el proyecto deja de listarse en la navegación cotidiana
- **AND** sus secciones y tareas siguen existiendo sin cambios

#### Scenario: Eliminar un proyecto muestra cuántas tareas se pierden

- **WHEN** se inicia la eliminación de un proyecto que tiene 12 tareas propias más
  las subtareas de sus secciones
- **THEN** el diálogo de confirmación muestra la cantidad total de tareas que se
  van a perder antes de poder confirmar
- **AND** la eliminación no ocurre si no se confirma explícitamente

#### Scenario: Eliminar un proyecto borra en cascada y no se puede deshacer

- **WHEN** se confirma la eliminación de un proyecto con secciones y tareas
- **THEN** el proyecto, sus secciones y todas sus tareas se borran físicamente de
  la base de datos
- **AND** no existe ninguna acción de deshacer disponible para esa eliminación

### Requirement: Reordenar proyectos por arrastre o por menú contextual

Un proyecto SHALL poder reordenarse arrastrando y soltando, y la misma acción
SHALL estar disponible también desde el menú contextual, de forma que ninguna
persona dependa exclusivamente del arrastre para reordenar.

#### Scenario: Reordenar arrastrando

- **WHEN** se arrastra un proyecto a una nueva posición entre sus hermanos
- **THEN** el proyecto queda ubicado en esa posición

#### Scenario: Reordenar desde el menú contextual sin usar arrastre

- **WHEN** se usa una acción del menú contextual del proyecto (o su equivalente
  accesible por teclado) para moverlo antes o después de otro proyecto hermano
- **THEN** el proyecto queda reordenado sin que se haya usado ningún gesto de
  arrastre

### Requirement: La Bandeja de entrada es un proyecto especial protegido

Toda cuenta SHALL tener, desde el momento del registro, un proyecto especial de
Bandeja de entrada. Toda tarea que se cree sin asignarle un proyecto SHALL caer
en la Bandeja de entrada. La Bandeja de entrada NUNCA SHALL poder borrarse ni
archivarse, y esa protección SHALL estar garantizada en la base de datos —no
solo ocultando el botón en la interfaz—.

#### Scenario: La Bandeja existe desde el registro

- **WHEN** una cuenta se registra por primera vez
- **THEN** ya existe un proyecto de Bandeja de entrada asociado a esa cuenta antes
  de cualquier acción manual

#### Scenario: Una tarea sin proyecto cae en la Bandeja

- **WHEN** se crea una tarea sin indicar ningún proyecto de destino
- **THEN** la tarea queda ubicada en la Bandeja de entrada de esa cuenta

#### Scenario: La base de datos rechaza borrar la Bandeja aunque se intente sin pasar por la interfaz

- **WHEN** se intenta borrar o archivar directamente en base de datos el proyecto
  con `is_inbox = true` de una cuenta, sin pasar por ningún control de la interfaz
- **THEN** la operación es rechazada por un trigger de la base de datos

#### Scenario: Solo existe una Bandeja por cuenta

- **WHEN** se intenta crear un segundo proyecto con `is_inbox = true` para la
  misma cuenta
- **THEN** la base de datos rechaza la operación por el índice único parcial

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

### Requirement: Toda superficie arrastrable tiene un camino alternativo

Ninguna acción de reordenamiento o anidado de proyectos o secciones SHALL estar
disponible únicamente por arrastre. Toda superficie arrastrable SHALL tener
además un camino equivalente por teclado o por menú contextual.

#### Scenario: Anidar un proyecto sin usar arrastre

- **WHEN** se usa una acción del menú contextual (o su equivalente accesible por
  teclado) para convertir un proyecto en subproyecto de otro
- **THEN** el proyecto queda anidado sin que se haya usado ningún gesto de
  arrastre

#### Scenario: Reordenar una sección sin usar arrastre

- **WHEN** se usa una acción del menú contextual (o su equivalente accesible por
  teclado) para mover una sección antes o después de otra
- **THEN** la sección queda reordenada sin que se haya usado ningún gesto de
  arrastre

### Requirement: Compartir un proyecto desde su menú

El menú de acciones de un proyecto SHALL ofrecer generar, copiar, regenerar y desactivar su enlace de lectura, junto a editar, duplicar, archivar y eliminar. La Bandeja de entrada NUNCA SHALL ofrecerlo.

Un proyecto compartido SHALL mostrar una indicación visible de que lo está: NUNCA SHALL quedar compartido sin que se note.

#### Scenario: Compartir está en el menú del proyecto

- **WHEN** se abre el menú de acciones de un proyecto
- **THEN** SHALL ofrecerse generar o administrar su enlace de lectura

#### Scenario: Un proyecto compartido se distingue

- **WHEN** un proyecto tiene enlace de lectura activo
- **THEN** SHALL verse una indicación de que está compartido

### Requirement: Duplicar un proyecto

El menú de acciones de un proyecto SHALL ofrecer duplicarlo, junto a editar, archivar y eliminar. La Bandeja de entrada NUNCA SHALL ofrecerlo, igual que no ofrece editar, archivar ni eliminar.

La copia SHALL incluir el nombre con un sufijo que la distinga del original, el color, el ícono, la descripción, la vista preferida, todas sus secciones con su descripción, y todas sus tareas pendientes con sus subtareas y sus etiquetas.

La copia NUNCA SHALL incluir tareas **raíz** completadas, comentarios, recordatorios, ni el estado de favorito o archivado.

Una **subtarea** completada que cuelga de una tarea raíz pendiente SÍ SHALL copiarse, y SHALL nacer pendiente. La regla de excluir completadas existe para que la copia no nazca con trabajo ya hecho que nadie hizo; una subtarea que renace pendiente no produce eso, y en cambio devuelve la lista de pasos completa, que es lo que se busca al repetir un proceso.

Las fechas SHALL copiarse sin modificar: duplicar deja una copia igual. NUNCA SHALL limpiarse ni desplazarse — eso sería una plantilla, que es otra función.

Los subproyectos del proyecto duplicado NUNCA SHALL copiarse: se duplica el proyecto elegido, no su árbol.

La copia SHALL quedar junto al original en el árbol de proyectos y SHALL abrirse al terminar. "Junto al original" SHALL entenderse como **hermano**: duplicar un subproyecto produce otro subproyecto del mismo padre, NUNCA un proyecto raíz.

#### Scenario: Duplicar copia estructura y tareas

- **WHEN** se duplica un proyecto con dos secciones y cinco tareas pendientes, una de ellas con subtareas y etiquetas
- **THEN** SHALL crearse un proyecto nuevo con las dos secciones, las cinco tareas, sus subtareas y sus etiquetas

#### Scenario: Las tareas raíz completadas no se copian

- **WHEN** se duplica un proyecto que tiene tareas raíz completadas
- **THEN** la copia NUNCA SHALL incluirlas

#### Scenario: Una subtarea completada renace pendiente

- **WHEN** se duplica un proyecto con una tarea pendiente que tiene tres subtareas, una de ellas completada
- **THEN** la copia SHALL incluir las tres subtareas
- **AND** las tres SHALL estar pendientes

#### Scenario: Los recordatorios no se copian

- **WHEN** se duplica un proyecto cuyas tareas tienen recordatorios
- **THEN** la copia NUNCA SHALL incluirlos, para no disparar avisos duplicados

#### Scenario: Las fechas quedan igual

- **WHEN** se duplica un proyecto con tareas que vencen en fechas concretas
- **THEN** las copias SHALL tener las mismas fechas

#### Scenario: Los subproyectos no se arrastran

- **WHEN** se duplica un proyecto que tiene dos subproyectos
- **THEN** SHALL copiarse únicamente el proyecto elegido

#### Scenario: La Bandeja no se puede duplicar

- **WHEN** se abre el menú de acciones de la Bandeja de entrada
- **THEN** NUNCA SHALL ofrecerse duplicar

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

