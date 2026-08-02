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
dónde va a quedar la tarea y permite cambiarlo. Los controles de fecha, fecha
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

