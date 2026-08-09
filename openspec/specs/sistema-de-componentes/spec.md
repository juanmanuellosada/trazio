# sistema-de-componentes Specification

## Purpose
TBD - created by archiving change interfaz-propia. Update Purpose after archive.
## Requirements
### Requirement: Ningún control interactivo es nativo del navegador

La aplicación SHALL implementar todo control interactivo de fecha, hora, color y selección como componente propio, y NUNCA SHALL usar `confirm`, `alert` ni `prompt` del navegador para pedir confirmación, avisar de algo o solicitar un texto.

#### Scenario: Ningún input nativo de fecha, hora o color

- **WHEN** se necesita capturar una fecha, una hora o un color en cualquier formulario de la aplicación
- **THEN** el control mostrado SHALL ser un componente propio, nunca un `<input type="date">`, `<input type="time">`, `<input type="datetime-local">` ni `<input type="color">` del navegador

#### Scenario: Ninguna confirmación usa el diálogo del navegador

- **WHEN** la aplicación necesita confirmar una acción, avisar de un error o pedir un texto corto
- **THEN** SHALL usar un componente propio de diálogo o confirmación
- **AND** NUNCA SHALL invocar `window.confirm`, `window.alert` ni `window.prompt`

### Requirement: El detalle de tarea ya no usa campos de fecha nativos

El detalle de tarea SHALL usar el selector de fecha propio para la fecha de vencimiento y la fecha límite, y el selector de hora propio para la hora, reemplazando los tres campos nativos que la auditoría encontró (`type="date"` en fecha de vencimiento y en fecha límite, `type="datetime-local"` en la hora).

#### Scenario: La fecha de vencimiento no usa input nativo

- **WHEN** se abre el detalle de una tarea y se edita su fecha de vencimiento
- **THEN** el control mostrado SHALL ser el selector de fecha propio, no un `<input type="date">` ni un `<input type="datetime-local">`

#### Scenario: La fecha límite no usa input nativo

- **WHEN** se abre el detalle de una tarea y se edita su fecha límite (`deadline`)
- **THEN** el control mostrado SHALL ser el selector de fecha límite propio, no un `<input type="date">`

### Requirement: Insertar un enlace en el editor no usa el diálogo del navegador

Insertar o editar un enlace en el editor de descripción SHALL abrir un diálogo propio que pide la URL, reemplazando el `window.prompt` que la auditoría encontró.

#### Scenario: Insertar enlace abre un diálogo propio

- **WHEN** se usa la acción de insertar o editar un enlace en el editor de descripción
- **THEN** SHALL abrirse un diálogo propio con un campo para la URL
- **AND** NUNCA SHALL invocarse `window.prompt`

### Requirement: La capa superpuesta es la primitiva base de toda superposición

Toda superposición de la aplicación —diálogo, menú contextual, selector desplegable o confirmación— SHALL construirse sobre una única primitiva de capa superpuesta compartida, que gestiona el montaje sobre el resto del contenido y el bloqueo del scroll del fondo mientras está abierta.

#### Scenario: Una capa abierta bloquea el scroll del fondo

- **WHEN** se abre cualquier diálogo, menú contextual, selector desplegable o confirmación
- **THEN** el contenido detrás de la capa SHALL dejar de hacer scroll mientras esa capa esté abierta

### Requirement: Los diálogos atrapan el foco y se cierran con Escape

Todo diálogo propio SHALL atrapar el foco del teclado dentro de sí mientras esté abierto, SHALL devolver el foco al elemento que lo abrió al cerrarse, SHALL cerrarse al presionar `Escape`, y SHALL anunciarse a lectores de pantalla con su rol y su título.

#### Scenario: Tab no sale del diálogo abierto

- **WHEN** un diálogo está abierto y se presiona `Tab` repetidamente
- **THEN** el foco SHALL recorrer únicamente los elementos interactivos dentro del diálogo, sin salir a elementos de fondo

#### Scenario: Escape cierra el diálogo y devuelve el foco

- **WHEN** un diálogo está abierto y se presiona `Escape`
- **THEN** el diálogo SHALL cerrarse
- **AND** el foco SHALL volver al elemento que lo abrió

### Requirement: Los menús contextuales se navegan por teclado

Todo menú contextual propio SHALL abrirse con clic derecho o con la tecla de menú del teclado, SHALL navegarse con las flechas del teclado, SHALL activar la opción resaltada con `Enter`, y SHALL cerrarse con `Escape` o al hacer clic afuera.

#### Scenario: Las flechas navegan las opciones del menú

- **WHEN** un menú contextual está abierto
- **THEN** las flechas arriba y abajo del teclado SHALL mover el resaltado entre las opciones disponibles

#### Scenario: Escape cierra el menú contextual sin ejecutar ninguna opción

- **WHEN** un menú contextual está abierto y se presiona `Escape`
- **THEN** el menú SHALL cerrarse
- **AND** ninguna opción SHALL ejecutarse

### Requirement: Los selectores desplegables se abren y navegan por teclado

Todo selector desplegable propio SHALL abrirse con `Enter` o `Espacio` estando enfocado, SHALL navegarse con las flechas del teclado, y SHALL anunciar a lectores de pantalla la opción actualmente seleccionada.

#### Scenario: El teclado abre y elige una opción del selector

- **WHEN** un selector desplegable está enfocado y se presiona `Enter` o `Espacio`
- **THEN** las opciones SHALL mostrarse
- **AND** SHALL poder elegirse una opción con las flechas y confirmarse con `Enter`, sin usar el mouse

### Requirement: Las confirmaciones propias reemplazan al confirm nativo en acciones destructivas

Toda acción destructiva de la aplicación, incluido el borrado de un proyecto, SHALL pedir confirmación mediante el diálogo de confirmación propio, nunca mediante `window.confirm`.

#### Scenario: Borrar un proyecto pide confirmación con el diálogo propio

- **WHEN** se inicia la acción de eliminar un proyecto
- **THEN** SHALL mostrarse el diálogo de confirmación propio con la acción y su consecuencia
- **AND** la operación SHALL cancelarse si el diálogo se cierra sin confirmar

### Requirement: Las primitivas cumplen accesibilidad AA

Toda primitiva compartida SHALL cumplir el nivel AA de WCAG: todo control SHALL ser alcanzable únicamente por teclado, SHALL mostrar un foco visible al recibirlo, y todo texto e ícono SHALL cumplir el contraste mínimo de AA contra su fondo.

#### Scenario: Cada control de una primitiva es alcanzable solo con teclado

- **WHEN** se navega cualquier primitiva compartida usando únicamente `Tab`, `Shift+Tab` y las flechas
- **THEN** SHALL poder alcanzarse y activarse cada control interactivo de la primitiva sin usar el mouse

#### Scenario: El foco activo siempre es visible

- **WHEN** un control de cualquier primitiva recibe el foco
- **THEN** SHALL mostrarse un indicador de foco visible contra su fondo

### Requirement: Las primitivas se construyen sobre los componentes de shadcn/ui ya instalados

Las primitivas compartidas SHALL construirse sobre los componentes de shadcn/ui ya instalados (diálogo, menú desplegable, popover, comando), agregándoles la capa de identidad visual y de copy propia de Trazio, en vez de reimplementar el manejo de foco, teclado y anuncio a lectores de pantalla que esos componentes ya resuelven.

#### Scenario: El manejo de foco no se reimplementa

- **WHEN** se construye una primitiva nueva sobre un componente de shadcn/ui ya instalado
- **THEN** el manejo de foco, teclado y anuncio a lectores de pantalla SHALL delegarse al componente de base
- **AND** el trabajo propio SHALL limitarse a la capa visual y de comportamiento específico de Trazio

### Requirement: El avatar de cuenta muestra la foto, con las iniciales como respaldo

Donde se muestra la cuenta —panel lateral, menú de cuenta y la sección de perfil de Configuración— SHALL mostrarse la foto de perfil cuando existe.

Las iniciales SHALL mostrarse por defecto y la foto encima cuando existe y carga bien, NUNCA al revés: quien se registró con correo y contraseña no tiene foto y nunca la va a tener, así que las iniciales son el caso normal para esas cuentas, no un estado de carga.

Si la carga de la foto falla, SHALL verse las iniciales. Este respaldo SHALL estar cableado de forma explícita.

#### Scenario: Una cuenta con foto la muestra

- **WHEN** la cuenta tiene `avatar_url` cargado y se abre el panel lateral
- **THEN** SHALL verse la foto de perfil

#### Scenario: Una cuenta sin foto muestra sus iniciales

- **WHEN** la cuenta no tiene `avatar_url`
- **THEN** SHALL verse sus iniciales, en las tres superficies

#### Scenario: Una foto que no carga cae en las iniciales

- **WHEN** la URL de la foto no responde
- **THEN** SHALL verse las iniciales, NUNCA un hueco ni un ícono roto

