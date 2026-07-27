## ADDED Requirements

### Requirement: Un único componente de alta, reutilizado en todas las superficies

El alta de una tarea SHALL resolverse con un único componente de alta rico,
instanciado — no reimplementado — en las vistas Bandeja de entrada, Hoy y
Proyecto, dentro de cada sección de un proyecto, y al crear una subtarea desde
el detalle de otra tarea. La vista Completado SHALL NOT ofrecer alta de
tareas, y la vista Próximos es de fase 2: no existe todavía. Ninguna de esas
superficies SHALL tener su propia implementación de alta.

#### Scenario: El mismo componente aparece en las tres vistas

- **WHEN** se abre el alta de tarea desde Bandeja de entrada, desde Hoy y
  desde un Proyecto
- **THEN** en las tres superficies se monta el mismo componente de alta, con
  los mismos campos y el mismo comportamiento

#### Scenario: El alta dentro de una sección usa el mismo componente

- **WHEN** se agrega una tarea directamente dentro de una sección de un
  proyecto
- **THEN** se abre el mismo componente de alta que en las demás superficies,
  preconfigurado con esa sección como destino

#### Scenario: El alta de una subtarea usa el mismo componente

- **WHEN** se crea una subtarea desde el detalle de una tarea existente
- **THEN** se abre el mismo componente de alta que en las demás superficies,
  preconfigurado con esa tarea como padre

### Requirement: Campos y accesos del componente de alta

El componente de alta SHALL ofrecer un campo de título, un campo de
descripción, y accesos para asignar fecha, prioridad, fecha límite y proyecto
destino. Los controles de fecha, fecha límite y prioridad SHALL ser los
selectores definidos por la capacidad `selectores-de-atributos`; este
requisito no redefine su comportamiento interno, solo exige que el alta los
use.

#### Scenario: Los cuatro accesos están disponibles

- **WHEN** se abre el componente de alta
- **THEN** se ofrecen accesos para asignar fecha, prioridad, fecha límite y
  proyecto destino, además del título y la descripción
- **AND** cada acceso abre el selector correspondiente de
  `selectores-de-atributos`

### Requirement: El alta sigue entendiendo lenguaje natural en el título

El campo de título del componente de alta SHALL conservar el reconocimiento
de lenguaje natural de la capacidad `parser-lenguaje-natural`: el contrato
canónico de `docs/parser-test-cases.md` y su resaltado en vivo mientras se
escribe SHALL seguir cumpliéndose sin ninguna excepción, sea cual sea la
superficie desde la que se abrió el componente. Reemplazar el alta de solo
título por este componente NUNCA SHALL degradar ni desactivar el
reconocimiento del parser.

#### Scenario: El parser sigue resolviendo atributos desde el nuevo componente

- **WHEN** se escribe `Comprar pan mañana` en el campo de título del
  componente de alta, en cualquiera de sus superficies
- **THEN** el texto reconocido se resalta en vivo mientras se escribe
- **AND** al confirmar, el título queda en `Comprar pan` y `due_date` resuelve
  a hoy+1, igual que exige el contrato del parser

#### Scenario: El doble clic sigue desactivando un token resaltado

- **WHEN** un token del título quedó resaltado por haber producido un
  atributo, y se hace doble clic sobre ese resaltado
- **THEN** el resaltado desaparece, el atributo asociado se descarta, y el
  texto del token permanece en el título como texto común

### Requirement: Confirmar y cancelar, con el destino visible

El componente de alta SHALL ofrecer una acción de confirmar y una de
cancelar. El proyecto y, si corresponde, la sección de destino SHALL estar
visibles antes de confirmar, sin requerir abrir el selector de proyecto para
saber dónde va a quedar la tarea.

#### Scenario: El destino se ve antes de confirmar

- **WHEN** se abre el componente de alta con un proyecto o sección de destino
  ya determinado (por contexto o por `@` en el título)
- **THEN** ese destino se muestra en el componente antes de que se confirme la
  creación de la tarea

#### Scenario: Cancelar no crea la tarea

- **WHEN** se cancela el alta después de haber escrito contenido en el título
  o la descripción
- **THEN** ninguna tarea se crea
- **AND** el componente se cierra sin persistir nada

### Requirement: Composición con lugar reservado para recordatorios y etiquetas

El componente de alta SHALL diseñarse con lugar en su composición para
recordatorios y para etiquetas, sin mostrar ningún control de esos dos
atributos hoy. Este requisito exige que agregarlos en fase 2 no obligue a
rehacer el componente; no exige ni permite mostrarlos deshabilitados ni en
ningún estado visible mientras tanto.

#### Scenario: Recordatorios y etiquetas no se muestran hoy

- **WHEN** se abre el componente de alta en esta fase
- **THEN** no se muestra ningún control de recordatorios ni de etiquetas, ni
  siquiera deshabilitado

### Requirement: Adjuntar archivos no entra, permanentemente

El componente de alta NUNCA SHALL ofrecer una forma de adjuntar archivos, ni
implementada ni mostrada como control deshabilitado. `docs/product-spec.md`
§13 pone adjuntar archivos fuera de alcance de forma permanente, en ninguna
versión; que la referencia visual del alta lo muestre no cambia esa decisión.

#### Scenario: No hay ningún control de adjuntar archivos

- **WHEN** se abre el componente de alta en cualquiera de sus superficies
- **THEN** no existe ningún botón, ícono ni zona de arrastre para adjuntar un
  archivo
- **AND** no existe tampoco una versión deshabilitada de ese control
