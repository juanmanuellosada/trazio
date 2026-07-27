# proyectos-secciones Specification

## Purpose
TBD - created by archiving change fase-1-base-usable. Update Purpose after archive.
## Requirements
### Requirement: Crear y editar un proyecto

Toda cuenta SHALL poder crear un proyecto con nombre, y SHALL poder editar en
cualquier momento su nombre, color, ícono y descripción. El color SHALL elegirse
de una paleta fija de proyecto, validada con un check constraint en base de datos
y con el mismo esquema de Zod compartido desde `lib/validation/`: MUST NOT
aceptarse un color libre fuera de esa paleta. El ícono SHALL ser un emoji.

#### Scenario: Crear un proyecto con los campos básicos

- **WHEN** una persona crea un proyecto nuevo indicando nombre, color de la paleta
  y un emoji como ícono
- **THEN** el proyecto se guarda con esos valores y una descripción vacía por defecto

#### Scenario: Editar nombre, color, ícono y descripción

- **WHEN** se edita un proyecto existente cambiando su nombre, su color, su ícono
  o su descripción
- **THEN** el proyecto queda actualizado con los nuevos valores
- **AND** el resto de sus campos no cambia

#### Scenario: Un color fuera de la paleta se rechaza

- **WHEN** se intenta crear o editar un proyecto con un valor de color que no
  pertenece a la paleta fija
- **THEN** la operación se rechaza tanto en la validación de Zod como en el check
  constraint de la base de datos

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

Dentro de un proyecto, SHALL poder crearse una sección con nombre. Una sección
SHALL poder renombrarse, reordenarse entre las demás secciones del mismo
proyecto, colapsarse y expandirse, y eliminarse. Al eliminar una sección, sus
tareas NUNCA SHALL borrarse: quedan sin sección, dentro del mismo proyecto.

#### Scenario: Crear y renombrar una sección

- **WHEN** se crea una sección con un nombre dentro de un proyecto, y luego se le
  cambia el nombre
- **THEN** la sección existe con el nombre más reciente, dentro de ese proyecto

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

