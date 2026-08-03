# alta-de-tareas Specification

## Purpose
TBD - created by archiving change interfaz-propia. Update Purpose after archive.
## Requirements
### Requirement: Un único componente de alta, reutilizado en todas las superficies

El alta de una tarea SHALL resolverse siempre con el mismo componente de
alta subyacente, instanciado — no reimplementado — en las vistas Bandeja de
entrada, Hoy, Próximos y Proyecto, dentro de cada sección de un proyecto, al
crear una subtarea desde el detalle de otra tarea, y **al crear una tarea
arrastrando sobre un rango libre del calendario**. Ese componente SHALL
renderizarse en dos superficies con tratamiento distinto, nunca como dos
implementaciones separadas: desde el botón de agregar tarea del panel
lateral y desde su atajo global se abre un modal; dentro de una lista, de una
sección de un proyecto, o al crear una subtarea desde el detalle, se abre un
modal incrustado en la vista, compacto, aprovechando el ancho disponible. La
vista Completado SHALL NOT ofrecer alta de tareas. Ninguna de esas superficies
SHALL tener su propia implementación de alta, ni siquiera cuando necesite
expresar algo que el componente compartido todavía no sabe expresar: en ese
caso lo que SHALL extenderse es el componente compartido.

#### Scenario: El modal global abre plegado

- **WHEN** se abre el alta de tarea desde el botón del panel lateral o desde su
  atajo global
- **THEN** se muestran el campo de título y el destino
- **AND** el resto de los campos NUNCA SHALL estar desplegado hasta que se use el
  control de desplegar

#### Scenario: Desplegar el modal global muestra el resto de los campos

- **WHEN** se usa el control de desplegar en el modal global
- **THEN** se muestran la descripción y los accesos de fecha, fecha límite,
  prioridad, etiquetas y recordatorios

#### Scenario: El alta dentro de una lista o de una sección abre el modal incrustado

- **WHEN** se agrega una tarea directamente dentro de Bandeja de entrada,
  Hoy, Próximos, un Proyecto, o dentro de una sección de un proyecto
- **THEN** se abre un modal incrustado en la vista, compacto,
  preconfigurado con ese contexto como destino
- **AND** SHALL abrirse desplegado, porque llegar ahí ya declaró la intención

#### Scenario: El alta de una subtarea usa el modal incrustado

- **WHEN** se crea una subtarea desde el detalle de una tarea existente
- **THEN** se abre el modal incrustado y compacto, preconfigurado con esa
  tarea como padre

#### Scenario: El alta del calendario usa el mismo componente

- **WHEN** se arrastra sobre un rango libre del calendario para crear una tarea
- **THEN** el alta SHALL resolverse con el componente compartido
- **AND** el rango arrastrado SHALL entrar como fecha y horario de contexto
- **AND** NUNCA SHALL usarse un selector nativo del navegador

#### Scenario: Las dos superficies comparten el mismo componente

- **WHEN** se compara la implementación del modal global con la del modal
  incrustado de una lista o sección
- **THEN** ambas superficies se construyen sobre el mismo componente de
  alta, y lo único que cambia entre ellas es qué campos se muestran, nunca
  el componente subyacente

### Requirement: Campos y accesos del componente de alta

El componente de alta SHALL ofrecer, en sus dos tratamientos, un campo de
título, un campo de descripción, y accesos para asignar fecha, prioridad,
fecha límite, **etiquetas, recordatorios** y **proyecto y sección de destino**.

El destino SHALL mostrarse en las dos superficies, como un control que indica a
dónde va a quedar la tarea y permite cambiarlo, **salvo cuando el alta se abre con una
tarea padre**: una subtarea hereda el proyecto de su padre y no puede estar en otro, así
que ahí el control de destino NUNCA SHALL mostrarse. La excepción rige por tener padre, no
por tratamiento: dentro de una lista o de una sección, sin padre, el destino se muestra
igual.

Los controles de fecha, fecha
límite y prioridad SHALL ser los selectores definidos por la capacidad
`selectores-de-atributos` en las dos superficies; este requisito no redefine su
comportamiento interno, solo exige que el alta los use. Los de etiquetas y
recordatorios SHALL ser los mismos que usa el detalle de una tarea.

#### Scenario: Los dos tratamientos ofrecen los mismos atributos

- **WHEN** se abre el componente de alta, en cualquiera de sus dos tratamientos,
  con todos sus campos desplegados
- **THEN** se ofrecen título, descripción, y accesos para fecha, prioridad,
  fecha límite, etiquetas, recordatorios y destino
- **AND** cada acceso abre el selector compartido correspondiente

#### Scenario: El tratamiento incrustado también muestra el destino

- **WHEN** se abre el componente de alta dentro de una lista o de una sección
- **THEN** SHALL mostrarse a qué proyecto y, si corresponde, a qué sección va a
  quedar la tarea
- **AND** ese control SHALL permitir cambiarlo sin salir del alta

#### Scenario: El alta de una subtarea no ofrece destino

- **WHEN** se abre el componente de alta para crear una subtarea, desde el menú de una
  fila o desde el detalle de una tarea
- **THEN** NUNCA SHALL mostrarse el control de destino
- **AND** la subtarea SHALL quedar en el mismo proyecto y la misma sección que su padre

#### Scenario: La excepción no alcanza al alta sin padre en una sección

- **WHEN** se abre el componente de alta dentro de una sección de un proyecto, sin tarea
  padre
- **THEN** el destino SHALL mostrarse igual que siempre

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
saber dónde va a quedar la tarea. Esto rige **en las dos superficies**.

El destino SHALL resolverse por esta cadena, del criterio más fuerte al más
débil: lo elegido en el selector; lo detectado por el parser en el título; el
contexto de la vista desde la que se abrió el alta; el proyecto por defecto de
las preferencias del usuario; y por último Bandeja de entrada.

#### Scenario: El destino se ve antes de confirmar, en las dos superficies

- **WHEN** se abre el componente de alta con un proyecto o sección de destino
  ya determinado, en cualquiera de sus dos tratamientos
- **THEN** ese destino se muestra en el componente antes de que se confirme la
  creación de la tarea

#### Scenario: El modal global hereda el contexto de la vista

- **WHEN** se abre el alta desde el botón del panel lateral o desde su atajo
  global, estando en un proyecto o en una sección
- **THEN** el destino SHALL ser ese proyecto y esa sección
- **AND** NUNCA SHALL caer en Bandeja de entrada por el solo hecho de haberse
  abierto desde una superficie global

#### Scenario: El modal global hereda la fecha en las vistas con fecha

- **WHEN** se abre el alta desde el botón del panel lateral o desde su atajo
  global, estando en Hoy o en Próximos
- **THEN** la fecha SHALL quedar preconfigurada con el día correspondiente

#### Scenario: Sin contexto se usa el proyecto por defecto de las preferencias

- **WHEN** se abre el alta desde una superficie que no aporta contexto de
  proyecto, y el usuario tiene configurado un proyecto por defecto
- **THEN** el destino SHALL ser ese proyecto
- **AND** solo si no hay ninguno configurado SHALL usarse Bandeja de entrada

#### Scenario: Lo elegido gana sobre lo heredado

- **WHEN** el alta heredó un destino del contexto y el usuario elige otro en el
  selector
- **THEN** SHALL usarse el elegido

#### Scenario: Cancelar no crea la tarea

- **WHEN** se cancela el alta después de haber escrito contenido en el título
  o la descripción
- **THEN** ninguna tarea se crea
- **AND** el componente se cierra sin persistir nada

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

### Requirement: Recordatorios y etiquetas se ofrecen en el alta

El componente de alta SHALL ofrecer controles de recordatorios y de etiquetas,
en sus dos tratamientos, cuando está desplegado. Estos controles SHALL ser los
mismos que usa el detalle de una tarea, no versiones propias.

Asignar etiquetas escribiendo `@` en el título SHALL seguir funcionando, con la
misma regla de precedencia que el resto de los atributos: lo elegido en el
selector gana sobre lo detectado por el parser.

#### Scenario: Los dos controles están disponibles al desplegar el alta

- **WHEN** se despliega el componente de alta
- **THEN** SHALL ofrecerse un control de etiquetas y uno de recordatorios

#### Scenario: El símbolo de etiqueta del parser sigue funcionando

- **WHEN** se escribe `@` seguido de un nombre en el título del alta
- **THEN** SHALL asignarse esa etiqueta, creándola si no existe, como hasta ahora

#### Scenario: Lo elegido en el selector de etiquetas gana sobre el parser

- **WHEN** el parser detectó etiquetas en el título y además se eligieron otras en
  el selector
- **THEN** SHALL usarse el conjunto elegido en el selector

### Requirement: El alta ofrece continuar en el detalle de la tarea

El componente de alta SHALL ofrecer, en sus dos superficies, una acción que **cree la tarea y
abra su detalle**, además de confirmar y cancelar.

Esa acción SHALL conservar todo lo cargado en el alta: el título con lo que el lenguaje
natural haya interpretado, la descripción, la fecha, la fecha límite, la prioridad, las
etiquetas, los recordatorios y el destino.

SHALL estar visible **sin desplegar los campos**, incluso en el modal que abre plegado: el
usuario se da cuenta de que la tarea necesita más justo cuando el alta le queda corta, que es
antes de desplegar nada.

SHALL ser una acción **secundaria**: la principal del alta sigue siendo agregar la tarea, y la
nueva NUNCA SHALL competir visualmente con ella.

Su nombre SHALL dejar claro que **crea** la tarea, para que nadie la pulse creyendo que solo
muestra más campos.

#### Scenario: Continuar en el detalle crea la tarea y la abre

- **WHEN** el usuario escribe una tarea en el alta y elige continuar en el detalle
- **THEN** la tarea SHALL quedar creada
- **AND** SHALL abrirse su detalle

#### Scenario: No se pierde nada de lo cargado

- **WHEN** el usuario carga título, descripción, fecha, prioridad, etiquetas y destino en el
  alta y elige continuar en el detalle
- **THEN** el detalle SHALL mostrar todos esos valores

#### Scenario: La acción se ve sin desplegar

- **WHEN** el usuario abre el alta desde el panel lateral o desde su atajo, que abre plegada
- **THEN** la acción de continuar en el detalle SHALL estar visible
- **AND** NUNCA SHALL requerir desplegar los campos para encontrarla

#### Scenario: También está en el alta embebida

- **WHEN** el usuario abre el alta dentro de una lista o de una sección
- **THEN** SHALL ofrecerse la misma acción

#### Scenario: Cerrar el detalle no deshace la creación

- **WHEN** el usuario continúa en el detalle y después lo cierra sin editar nada
- **THEN** la tarea SHALL seguir existiendo, con lo que tenía al crearse

