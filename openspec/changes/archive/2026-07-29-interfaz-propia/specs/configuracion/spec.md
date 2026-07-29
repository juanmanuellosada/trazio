## RENAMED Requirements

- FROM: `### Requirement: Secciones de la pantalla de configuración en fase 1`
- TO: `### Requirement: Secciones del modal de configuración en fase 1`
- FROM: `### Requirement: Sección Perfil`
- TO: `### Requirement: Sección Cuenta`

## MODIFIED Requirements

### Requirement: Secciones del modal de configuración en fase 1

La configuración SHALL presentarse como un modal con secciones navegables, en
vez de una pantalla propia, y SHALL incluir en fase 1 las secciones Cuenta,
General, Tema e Instalación. Las secciones Notificaciones y Calendarios del
spec funcional SHALL NOT aparecer en esta fase: push es fase 2 y la conexión
con Google Calendar es fase 4.

#### Scenario: Las cuatro secciones de fase 1 están presentes

- **WHEN** se abre el modal de configuración
- **THEN** aparecen las secciones Cuenta, General, Tema e Instalación

#### Scenario: Configuración abre como una capa superpuesta, no como una pantalla nueva

- **WHEN** se abre la configuración desde el panel lateral
- **THEN** se abre un modal por encima de la pantalla actual
- **AND** la pantalla de fondo permanece siendo la misma vista en la que estaba
  el usuario, en vez de navegar a una ruta separada de configuración

#### Scenario: Notificaciones y Calendarios no existen todavía

- **WHEN** se recorre el modal de configuración completo
- **THEN** no hay ninguna sección de Notificaciones
- **AND** no hay ninguna sección de Calendarios

### Requirement: Sección Cuenta

La sección Cuenta SHALL permitir editar el nombre, SHALL mostrar el correo
electrónico sin permitir editarlo, SHALL ofrecer la opción de cambiar la
contraseña, SHALL mostrar si el acceso a la cuenta se hizo con Google
ofreciendo la acción de desvincularlo, y SHALL NOT ofrecer ningún flujo para
vincular el acceso con Google a una cuenta creada con correo y contraseña: es
un flujo nuevo con casos de borde propios —correo que no coincide, otra
cuenta con ese correo— que queda fuera de este cambio.

#### Scenario: El nombre se puede editar y guardar

- **WHEN** se cambia el nombre en la sección Cuenta y se guarda
- **THEN** el nuevo nombre queda guardado
- **AND** se refleja en el resto de la interfaz

#### Scenario: El correo se muestra pero no se puede editar

- **WHEN** se abre la sección Cuenta
- **THEN** el correo electrónico de la cuenta se muestra
- **AND** el campo de correo SHALL NOT ser editable

#### Scenario: Cambiar la contraseña desde Cuenta

- **WHEN** se completa el formulario de cambio de contraseña con la contraseña
  actual y una nueva de 8 caracteres o más
- **THEN** la contraseña de la cuenta se actualiza

#### Scenario: Una cuenta vinculada con Google ofrece desvincularla

- **WHEN** se abre la sección Cuenta y el acceso de la cuenta se hizo con
  Google
- **THEN** la sección indica que el acceso está vinculado con Google
- **AND** ofrece la acción de desvincularlo

#### Scenario: Una cuenta de correo y contraseña no ofrece vincular Google

- **WHEN** se abre la sección Cuenta de una cuenta creada con correo y
  contraseña, sin acceso vinculado con Google
- **THEN** la sección no ofrece ninguna acción para vincular el acceso con
  Google
- **AND** no muestra ninguna indicación de estar vinculada

## ADDED Requirements

### Requirement: Ninguna sección de configuración se muestra inerte

La configuración SHALL mostrar únicamente las secciones cuyo contenido
funciona en la fase actual, y SHALL NOT mostrar una sección deshabilitada, en
gris, ni con un aviso de "próximamente" para una función que todavía no
existe (criterio de la decisión D7): una opción configurable que no hace nada
es un problema de confianza, y mostrarla inerte no lo resuelve.

#### Scenario: Notificaciones y Calendarios no aparecen mientras no tengan contenido real

- **WHEN** se abre el modal de configuración en una fase donde Notificaciones
  o Calendarios todavía no tienen contenido funcional
- **THEN** esa sección no aparece en el modal
- **AND** no aparece tampoco como sección deshabilitada ni con aviso de
  "próximamente"

#### Scenario: Una sección se agrega recién cuando su contenido funciona

- **WHEN** una sección como Notificaciones o Calendarios pasa a tener
  contenido funcional en una fase posterior
- **THEN** esa sección aparece completa y operativa
- **AND** en ningún momento anterior existió como versión inerte de esa misma
  sección
