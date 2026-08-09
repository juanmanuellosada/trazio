# filtros-guardados Specification

## Purpose
TBD - created by archiving change fase-2-potencia. Update Purpose after archive.
## Requirements
### Requirement: Crear un filtro guardado a partir de una consulta

El usuario SHALL poder crear un filtro indicando un nombre y una consulta en
el lenguaje de la capacidad `lenguaje-de-consulta`. La consulta SHALL
guardarse como texto crudo, sin compilar, y SHALL parsearse de nuevo en cada
ejecución del filtro, nunca en el momento de guardarlo.

#### Scenario: Crear un filtro guarda la consulta como texto

- **WHEN** el usuario crea un filtro llamado "Urgente sin esperar" con la
  consulta `priority:1,2 & !label:espera`
- **THEN** el filtro queda creado con ese nombre y ese texto de consulta
  guardado tal cual, sin convertirlo a una forma intermedia persistida

#### Scenario: Un cambio futuro del parser afecta a los filtros existentes

- **WHEN** se ejecuta un filtro guardado hace tiempo
- **THEN** su consulta se parsea en ese momento con la versión vigente del
  parser, en vez de reutilizar un resultado parseado en el pasado

### Requirement: Renombrar y editar la consulta de un filtro existente

El usuario SHALL poder renombrar un filtro y SHALL poder editar el texto de su
consulta guardada.

#### Scenario: Renombrar un filtro no afecta su consulta

- **WHEN** el usuario cambia el nombre de un filtro de "Urgente sin esperar" a
  "Foco de la semana"
- **THEN** el filtro conserva la misma consulta guardada

#### Scenario: Editar la consulta reemplaza el texto guardado

- **WHEN** el usuario edita la consulta de un filtro existente y guarda el
  cambio
- **THEN** las próximas ejecuciones del filtro usan la consulta nueva, no la
  anterior

### Requirement: El color de un filtro sigue la misma paleta que proyectos y etiquetas

Un filtro SHALL tener un color, elegible desde la misma paleta cerrada con
nombre que usan proyectos y etiquetas (D19). El filtro SHALL además poder
usar un color personalizado bajo las mismas condiciones que un proyecto
(D29): validado por contraste AA contra el fondo de superficie de ambos temas
antes de guardarse, rechazando cualquier valor que no lo cumpla.

#### Scenario: Elegir un color de la paleta fija

- **WHEN** el usuario crea o edita un filtro y elige el color con nombre
  "Naranja" de la paleta
- **THEN** el filtro queda guardado con ese color de la paleta

#### Scenario: Un color personalizado sin contraste suficiente se rechaza

- **WHEN** el usuario intenta guardar un filtro con un color personalizado
  que no cumple contraste AA contra el fondo de superficie en modo claro o en
  modo oscuro
- **THEN** el sistema rechaza ese color y el filtro no se guarda con él

### Requirement: Elegir un ícono para un filtro

Un filtro SHALL tener un ícono, elegible por el usuario al crearlo o editarlo,
siguiendo la misma convención de ícono como emoji que ya usan proyectos y
hábitos.

#### Scenario: Asignar un ícono al crear un filtro

- **WHEN** el usuario crea un filtro y elige el emoji 🎯 como ícono
- **THEN** el filtro queda creado con ese ícono

### Requirement: Marcar y desmarcar un filtro como favorito

El usuario SHALL poder marcar un filtro como favorito y SHALL poder
desmarcarlo, sin límite en la cantidad de filtros favoritos.

#### Scenario: Marcar un filtro como favorito

- **WHEN** el usuario marca un filtro existente como favorito
- **THEN** el filtro queda con su marca de favorito activa

#### Scenario: Desmarcar un filtro favorito

- **WHEN** el usuario desmarca un filtro que estaba marcado como favorito
- **THEN** el filtro deja de estar marcado como favorito, sin eliminarse

### Requirement: Eliminar un filtro guardado

El usuario SHALL poder eliminar un filtro. Eliminar un filtro MUST NOT afectar
ninguna tarea, etiqueta ni proyecto referenciado por su consulta.

#### Scenario: Eliminar un filtro no toca las tareas que mostraba

- **WHEN** se elimina un filtro cuya consulta mostraba varias tareas
- **THEN** esas tareas siguen existiendo sin ningún cambio
- **AND** el filtro deja de estar disponible en el panel lateral

### Requirement: Página de resultados de un filtro

Cada filtro SHALL tener su propia página, que SHALL ejecutar la consulta
guardada del filtro y SHALL mostrar las tareas resultantes.

#### Scenario: Abrir un filtro muestra las tareas que su consulta produce

- **WHEN** el usuario abre la página de un filtro cuya consulta es
  `due:overdue`
- **THEN** la página muestra exactamente las tareas pendientes con fecha de
  vencimiento anterior a hoy

### Requirement: Vista previa en vivo del conteo de coincidencias

Al crear o editar la consulta de un filtro, el sistema SHALL mostrar en vivo
cuántas tareas coinciden con el texto escrito hasta el momento, actualizándose
mientras el usuario tipea.

#### Scenario: El conteo cambia mientras se escribe la consulta

- **WHEN** el usuario escribe `priority:1` en el editor de consulta de un
  filtro y esa consulta coincide con 5 tareas
- **THEN** la vista previa muestra "5" antes de guardar el filtro
- **WHEN** el usuario continúa escribiendo hasta `priority:1 & due:today` y
  esa consulta coincide con 2 tareas
- **THEN** la vista previa se actualiza a "2" sin necesidad de guardar

#### Scenario: Una consulta con error de sintaxis no muestra un conteo

- **WHEN** el usuario escribe una consulta con un error de sintaxis en el
  editor de un filtro
- **THEN** la vista previa muestra el error en español en vez de un número de
  coincidencias

### Requirement: Ubicación de los filtros en el panel lateral

Los filtros marcados como favoritos SHALL aparecer en la sección Favoritos
del panel lateral. Los filtros no favoritos SHALL aparecer en una lista
colapsable de filtros, separada de la sección Favoritos.

#### Scenario: Un filtro favorito aparece en Favoritos

- **WHEN** el usuario marca un filtro como favorito
- **THEN** ese filtro aparece en la sección Favoritos del panel lateral

#### Scenario: Un filtro no favorito aparece en la lista colapsable

- **WHEN** un filtro no está marcado como favorito
- **THEN** ese filtro aparece únicamente dentro de la lista colapsable de
  filtros, no en Favoritos

### Requirement: Un filtro que referencia una etiqueta o proyecto eliminado no rompe su página

Abrir la página de un filtro MUST NOT fallar si su consulta guardada
referencia por nombre una etiqueta o un proyecto que ya no existe. El sistema
SHALL informar el problema en español.

#### Scenario: La etiqueta referenciada fue eliminada

- **WHEN** un filtro guarda la consulta `label:espera` y la etiqueta `espera`
  se elimina después
- **THEN** al abrir la página del filtro no se produce un error de la
  aplicación
- **AND** se informa en español que la etiqueta `espera` ya no existe

#### Scenario: El proyecto referenciado fue eliminado

- **WHEN** un filtro guarda la consulta `project:mudanza` y el proyecto
  `mudanza` se elimina después
- **THEN** al abrir la página del filtro no se produce un error de la
  aplicación
- **AND** se informa en español que el proyecto `mudanza` ya no existe

### Requirement: Los filtros se alcanzan desde la navegación principal

El panel lateral SHALL ofrecer Filtros como acceso principal, junto a Etiquetas, Hábitos y Completado. NUNCA SHALL ser necesario conocer la ruta de antemano ni encontrarla dentro del menú de la cuenta para llegar a la pantalla de filtros.

El enlace a filtros dentro del menú de la cuenta SHALL quitarse: con el acceso principal deja de hacer falta, y dos caminos al mismo lugar —uno en un menú de tema, configuración y cerrar sesión— hacen dudar de si son lo mismo.

#### Scenario: Se llega a los filtros desde el panel lateral

- **WHEN** se abre el panel lateral sin haber creado ningún filtro
- **THEN** SHALL verse un acceso principal a Filtros
- **AND** SHALL llevar a la pantalla de filtros

#### Scenario: El menú de la cuenta ya no lleva a filtros

- **WHEN** se abre el menú de la cuenta
- **THEN** NUNCA SHALL ofrecerse un acceso a la pantalla de filtros

### Requirement: La lista de filtros no desaparece por estar vacía

La lista de filtros del panel lateral NUNCA SHALL ocultarse por no tener ninguno: SHALL mostrar un estado vacío con un acceso para crear el primero.

El estado vacío NUNCA SHALL explicar el lenguaje de consulta: la pantalla de alta ya muestra los errores en español y cuenta las coincidencias mientras se escribe.

#### Scenario: Sin filtros, la lista invita a crear el primero

- **WHEN** se abre el panel lateral en una cuenta sin ningún filtro
- **THEN** la lista de filtros SHALL verse igual
- **AND** SHALL ofrecer crear el primero

#### Scenario: El estado vacío no da una clase de sintaxis

- **WHEN** se ve el estado vacío de la lista de filtros
- **THEN** NUNCA SHALL mostrarse una explicación del lenguaje de consulta

### Requirement: La pantalla de filtros explica el lenguaje con ejemplos

Donde se escribe una consulta SHALL ofrecerse una referencia del lenguaje que incluya todos los campos disponibles con sus valores posibles, los operadores de combinación y agrupación, y ejemplos concretos.

Los ejemplos SHALL insertarse en el campo de consulta al tocarlos, para que la vista previa del conteo de coincidencias —que ya existe y corre en vivo— muestre al instante cuántas tareas devuelven sobre los datos propios.

La lista de campos de la referencia y la que el parser usa para su error de campo desconocido SHALL derivar de una única fuente. NUNCA SHALL mantenerse por separado: el día que el lenguaje gane un campo, una referencia desactualizada mentiría, y una ayuda que miente es peor que ninguna.

#### Scenario: La referencia lista todos los campos

- **WHEN** se abre el alta de un filtro
- **THEN** SHALL poder consultarse una referencia con todos los campos del lenguaje, sus valores y los operadores

#### Scenario: Tocar un ejemplo lo prueba

- **WHEN** se toca un ejemplo de la referencia
- **THEN** ese ejemplo SHALL quedar en el campo de consulta
- **AND** la vista previa SHALL mostrar cuántas tareas coinciden

#### Scenario: La referencia no se desactualiza sola

- **WHEN** se agrega un campo nuevo al lenguaje de consulta
- **THEN** SHALL aparecer en la referencia sin mantenerla aparte

