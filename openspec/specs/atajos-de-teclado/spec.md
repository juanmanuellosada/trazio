# atajos-de-teclado Specification

## Purpose
TBD - created by archiving change fase-2-potencia. Update Purpose after archive.
## Requirements
### Requirement: Los atajos con modificador Ctrl o Cmd se disparan con el foco en un campo de texto; las teclas sueltas no

Un atajo cuyo binding requiere el modificador `Ctrl` o `Cmd` (`metaKey`) SHALL dispararse aunque el elemento con foco sea un `input`, un `textarea` o un elemento `contenteditable`, porque ese modificador nunca se escribe dentro del campo. Un atajo de tecla suelta, sin `Ctrl` ni `Cmd` —incluida una combinación con `Shift` sin ninguno de esos dos, como `⇧Supr`— NUNCA SHALL dispararse en esa misma situación, porque esa tecla sí se escribiría dentro del campo. `Ctrl/Cmd+Z` SHALL dispararse siempre, como caso particular de atajo con modificador.

#### Scenario: Q no hace nada mientras se escribe un título

- **WHEN** el foco está en el campo de título de una tarea, con el cursor en
  medio del texto, y se presiona `Q`
- **THEN** la letra `q` se escribe en el campo y no se abre el alta rápida de
  tarea

#### Scenario: Ctrl+S guarda el detalle mientras se escribe

- **WHEN** el foco está en un campo de texto del detalle de una tarea, con
  cambios sin guardar, y se presiona `Ctrl+S`
- **THEN** los cambios del detalle se guardan

#### Scenario: Shift+Ctrl+C y Ctrl+Shift+N funcionan con foco en un campo de texto

- **WHEN** el foco está en un campo de texto del menú contextual de una tarea
  y se presiona `⇧Ctrl+C`
- **THEN** se copia al portapapeles el enlace directo de esa tarea
- **WHEN** se presiona `Ctrl⇧N`
- **THEN** esa tarea se abre en una ventana nueva

#### Scenario: Shift+Supr sigue bloqueado porque no lleva Ctrl ni Cmd

- **WHEN** el foco está en un campo de texto y se presiona `⇧Supr`
- **THEN** no se dispara la eliminación de ninguna tarea

#### Scenario: Ctrl/Cmd+Z sí funciona mientras se escribe

- **WHEN** el foco está en el campo de título de una tarea y se presiona
  `Ctrl/Cmd+Z`
- **THEN** se dispara el deshacer de la última acción, según la capacidad
  `deshacer`

### Requirement: Atajos generales de navegación y acceso rápido

La aplicación SHALL registrar, disponibles desde cualquier pantalla, el acorde `G` seguido de `I` (Bandeja de entrada), `T` (Hoy), `U` (Próximos), `C` (Completado) o `A` (Hábitos); `S` para abrir el buscador; `Q` para abrir el alta rápida de tarea; `E` para abrir el alta de un nuevo evento de calendario; y `Ctrl/Cmd+Z` para deshacer. `G A` SHALL navegar a la pantalla de Hábitos (`/habitos`). `E` SHALL abrir el formulario de alta de un evento de calendario nuevo.

#### Scenario: El acorde G navega según la segunda tecla

- **WHEN** se presiona `G` y, dentro de la ventana del acorde, se presiona `I`
- **THEN** la aplicación navega a la Bandeja de entrada
- **WHEN** se presiona `G` y luego `T`
- **THEN** la aplicación navega a Hoy
- **WHEN** se presiona `G` y luego `U`
- **THEN** la aplicación navega a Próximos
- **WHEN** se presiona `G` y luego `C`
- **THEN** la aplicación navega a Completado
- **WHEN** se presiona `G` y luego `A`
- **THEN** la aplicación navega a Hábitos (`/habitos`)

#### Scenario: S abre el buscador

- **WHEN** se presiona `S` estando en la pantalla Hoy, sin foco en un campo de texto
- **THEN** se abre el buscador

#### Scenario: Q abre el alta rápida de tarea

- **WHEN** se presiona `Q` sin foco en un campo de texto
- **THEN** se abre el componente de alta rápida de tarea

#### Scenario: E abre el alta de un nuevo evento de calendario

- **WHEN** se presiona `E` sin foco en un campo de texto y sin el detalle de una tarea abierto
- **THEN** se abre el formulario de alta de un evento de calendario nuevo

### Requirement: Atajos del detalle de tarea

Con el detalle de una tarea abierto, la aplicación SHALL registrar `Ctrl+S`
para guardar, `D` para la fecha, `L` para la fecha límite, `F` para la
prioridad, `R` para los recordatorios, `O` para el proyecto, `E` para las
etiquetas y `N` para crear una nueva subtarea.

#### Scenario: Ctrl+S guarda los cambios del detalle

- **WHEN** con el detalle de una tarea abierto y cambios sin guardar, se
  presiona `Ctrl+S`
- **THEN** los cambios del detalle se guardan

#### Scenario: D, L, F, O y R abren sus selectores

- **WHEN** con el detalle de una tarea abierto se presiona `D`
- **THEN** se abre el selector de fecha de vencimiento
- **WHEN** se presiona `L`
- **THEN** se abre el selector de fecha límite
- **WHEN** se presiona `F`
- **THEN** se abre el selector de prioridad
- **WHEN** se presiona `O`
- **THEN** se abre el selector de proyecto
- **WHEN** se presiona `R`
- **THEN** se abre el selector de recordatorios

#### Scenario: N crea una nueva subtarea

- **WHEN** con el detalle de una tarea abierto se presiona `N`
- **THEN** se agrega una subtarea nueva y vacía, lista para escribir su título

### Requirement: Atajos según la pantalla activa

`S` en la Bandeja de entrada SHALL abrir el editor de secciones en lugar del
buscador. `⇧S` (Shift+S) en la pantalla de un proyecto SHALL agregar una nueva
sección a ese proyecto. `Escape` SHALL cerrar el menú o la ventana emergente
que esté abierta.

#### Scenario: S en Bandeja abre el editor de secciones

- **WHEN** estando en la Bandeja de entrada, sin foco en un campo de texto, se
  presiona `S`
- **THEN** se abre el editor de secciones de la Bandeja, y el buscador no se
  abre

#### Scenario: Shift+S agrega una sección en un proyecto

- **WHEN** estando en la pantalla de un proyecto se presiona `⇧S`
- **THEN** se agrega una nueva sección a ese proyecto

#### Scenario: Escape cierra un menú o una ventana emergente

- **WHEN** hay un menú contextual o una ventana emergente abierta y se
  presiona `Escape`
- **THEN** ese menú o esa ventana emergente se cierra

### Requirement: Atajos del menú contextual de tarea

Con el menú contextual de una tarea abierto, la aplicación SHALL registrar `T`
para cambiar la fecha, `Y` para cambiar la prioridad, `V` para mover a otro
proyecto o sección, `⇧Ctrl+C` para copiar el enlace directo, `Ctrl⇧N` para
abrir la tarea en una ventana nueva, y `⇧Supr` (Shift+Delete) para eliminarla.

#### Scenario: T, Y y V abren sus acciones desde el menú contextual

- **WHEN** con el menú contextual de una tarea abierto se presiona `T`
- **THEN** se abre el selector de fecha de esa tarea
- **WHEN** se presiona `Y`
- **THEN** se abre el selector de prioridad de esa tarea
- **WHEN** se presiona `V`
- **THEN** se abre el selector "mover a" de esa tarea

#### Scenario: Copiar enlace y abrir en ventana nueva

- **WHEN** con el menú contextual de una tarea abierto se presiona `⇧Ctrl+C`
- **THEN** se copia al portapapeles el enlace directo de esa tarea
- **WHEN** se presiona `Ctrl⇧N`
- **THEN** esa tarea se abre en una ventana nueva

#### Scenario: Shift+Supr elimina la tarea desde el menú contextual

- **WHEN** con el menú contextual de una tarea abierto se presiona `⇧Supr`
- **THEN** esa tarea se elimina

### Requirement: Resolución de colisiones por contexto

El binding más específico SHALL ganar cuando el mismo atajo tiene un binding
registrado por más de un contexto a la vez: el de la pantalla o el modal
activo por sobre el binding general.

#### Scenario: S gana para secciones en Bandeja y para el buscador en el resto

- **WHEN** se presiona `S` estando en la Bandeja de entrada
- **THEN** se abre el editor de secciones, no el buscador
- **WHEN** se presiona `S` estando en Hoy
- **THEN** se abre el buscador

#### Scenario: E gana para etiquetas cuando el detalle de tarea está abierto

- **WHEN** el detalle de una tarea está abierto y se presiona `E`
- **THEN** se abre el selector de etiquetas de esa tarea, y no se dispara el
  atajo general de nuevo evento

### Requirement: El acorde G espera la segunda tecla con un límite de tiempo

Tras presionar `G`, la aplicación SHALL esperar 1,5 segundos a que se presione
una de las teclas del acorde (`I`, `T`, `U`, `C`, `A`). Mientras el acorde está
pendiente, ninguna tecla suelta SHALL disparar su propio atajo. El acorde
pendiente SHALL cancelarse al presionar `Escape`, al presionar una tecla que
no forma parte del acorde, o al vencerse los 1,5 segundos sin que se presione
ninguna.

#### Scenario: Una tecla ajena al acorde lo cancela sin disparar su propio atajo

- **WHEN** se presiona `G` y, antes de que pase 1,5 segundos, se presiona `Q`
  (que fuera del acorde abre el alta rápida de tarea)
- **THEN** el acorde se cancela y el alta rápida de tarea no se abre

#### Scenario: Escape cancela el acorde pendiente

- **WHEN** se presiona `G` y luego, antes de completar el acorde, se presiona
  `Escape`
- **THEN** el acorde se cancela y no ocurre ninguna navegación

#### Scenario: El acorde se cancela solo si pasan 1,5 segundos sin la segunda tecla

- **WHEN** se presiona `G` y no se presiona ninguna otra tecla durante 1,5
  segundos
- **THEN** el acorde se cancela automáticamente

### Requirement: G A y E (nuevo evento) apuntan a pantallas de fases posteriores

`G A` SHALL navegar a la pantalla de Hábitos (`/habitos`), construida en la fase 3. El atajo general `E` SHALL abrir el formulario de alta de un evento de calendario nuevo, construido en esta fase.

#### Scenario: G A navega a la pantalla de Hábitos

- **WHEN** se presiona `G` y luego `A` dentro de la ventana del acorde
- **THEN** la aplicación navega a `/habitos`

#### Scenario: E como atajo general abre el alta de un nuevo evento

- **WHEN** se presiona `E` sin el detalle de una tarea abierto y sin foco en un campo de texto
- **THEN** se abre el formulario de alta de un evento de calendario nuevo

