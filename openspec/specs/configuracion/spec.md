# configuracion Specification

## Purpose
TBD - created by archiving change fase-1-base-usable. Update Purpose after archive.
## Requirements
### Requirement: Sección Tema

La sección Tema SHALL ofrecer las opciones claro, oscuro y según el sistema,
con "según el sistema" (`system`) como default.

#### Scenario: El default es "según el sistema"

- **WHEN** una cuenta recién creada abre la sección Tema por primera vez
- **THEN** la opción seleccionada es "según el sistema"

#### Scenario: Cambiar el tema se aplica de inmediato

- **WHEN** se elige "oscuro" o "claro" en la sección Tema
- **THEN** la interfaz cambia a ese tema sin recargar la página
- **AND** la preferencia queda guardada para la próxima vez que se entra

### Requirement: Zona horaria con la lista IANA completa

El selector de zona horaria SHALL ofrecer la lista completa de zonas IANA,
obtenida del navegador con `Intl` (decisión D8: la lista completa, no un
puñado fijo). El default SHALL ser `America/Argentina/Buenos_Aires`.

#### Scenario: El selector lista todas las zonas IANA del navegador

- **WHEN** se abre el selector de zona horaria
- **THEN** las opciones disponibles corresponden a la lista completa que
  devuelve `Intl.supportedValuesOf('timeZone')` (o equivalente) en el
  navegador
- **AND** la lista no está recortada a un puñado fijo de zonas

#### Scenario: El default es Buenos Aires

- **WHEN** una cuenta recién creada abre la sección General por primera vez
- **THEN** la zona horaria seleccionada es `America/Argentina/Buenos_Aires`

### Requirement: Formato de fecha

El selector de formato de fecha SHALL aceptar exactamente dos valores:
`dd/MM/yyyy` (default) y `yyyy-MM-dd`. No SHALL existir un formato mes-primero
(`MM/dd/yyyy`), porque sería incoherente con la regla R1 del parser de
lenguaje natural.

#### Scenario: Solo dos formatos disponibles

- **WHEN** se abre el selector de formato de fecha
- **THEN** las únicas opciones son `dd/MM/yyyy` y `yyyy-MM-dd`
- **AND** no hay ninguna opción de formato mes-primero

#### Scenario: El default es día-mes-año

- **WHEN** una cuenta recién creada abre la sección General por primera vez
- **THEN** el formato de fecha seleccionado es `dd/MM/yyyy`

### Requirement: Formato de hora

El selector de formato de hora SHALL aceptar 12 o 24 horas, con 24 como
default.

#### Scenario: El default es formato 24 horas

- **WHEN** una cuenta recién creada abre la sección General por primera vez
- **THEN** el formato de hora seleccionado es 24 horas

#### Scenario: Cambiar a formato 12 horas se refleja en toda la app

- **WHEN** se cambia el formato de hora a 12 horas y se guarda
- **THEN** las horas mostradas en toda la app pasan a mostrarse en formato 12
  horas con AM/PM

### Requirement: Día de inicio de semana

El selector de día de inicio de semana SHALL aceptar lunes, domingo o sábado,
con lunes (valor `1`) como default.

#### Scenario: El default es lunes

- **WHEN** una cuenta recién creada abre la sección General por primera vez
- **THEN** el día de inicio de semana seleccionado es lunes

#### Scenario: Cambiar el día de inicio de semana afecta las vistas que dependen de la semana

- **WHEN** se cambia el día de inicio de semana a domingo o a sábado
- **THEN** cualquier vista o cálculo que agrupe por semana usa el nuevo día
  como inicio

### Requirement: Pantalla por defecto al entrar

El selector de pantalla por defecto SHALL aceptar en fase 1 únicamente Bandeja
de entrada (default) u Hoy. Ninguna otra vista SHALL ofrecerse como pantalla
por defecto en esta fase.

#### Scenario: Solo dos opciones disponibles en fase 1

- **WHEN** se abre el selector de pantalla por defecto
- **THEN** las únicas opciones son Bandeja de entrada y Hoy

#### Scenario: El default es Bandeja de entrada

- **WHEN** una cuenta recién creada abre la sección General por primera vez
- **THEN** la pantalla por defecto seleccionada es Bandeja de entrada

#### Scenario: Entrar a la app abre la pantalla configurada

- **WHEN** una persona con la pantalla por defecto configurada en Hoy inicia
  sesión
- **THEN** la app la lleva directo a la vista Hoy, no a la Bandeja de entrada

### Requirement: Sección Instalación

La sección Instalación SHALL mostrar cómo instalar Trazio como aplicación
desde el navegador, incluidas instrucciones específicas para iPhone.

#### Scenario: Instrucciones generales de instalación

- **WHEN** se abre la sección Instalación en un navegador de escritorio o
  Android compatible
- **THEN** se muestran los pasos para instalar la app desde ese navegador

#### Scenario: Instrucciones específicas para iPhone

- **WHEN** se abre la sección Instalación desde Safari en iPhone
- **THEN** se muestran las instrucciones específicas para agregar Trazio a la
  pantalla de inicio en iOS, distintas de las de escritorio o Android

### Requirement: Sin selector de idioma

La pantalla de configuración SHALL NOT ofrecer ningún selector de idioma:
Trazio es exclusivamente en español (decisión D4).

#### Scenario: No existe ningún control de idioma

- **WHEN** se recorre la pantalla de configuración completa
- **THEN** no aparece ningún selector, botón ni mención a cambiar el idioma de
  la aplicación

### Requirement: Secciones del modal de configuración en fase 1

La configuración SHALL presentarse como un modal con secciones navegables, en vez de una pantalla propia, y SHALL incluir las secciones Cuenta, General, Tema, Instalación, Notificaciones y Calendarios.

#### Scenario: Las seis secciones están presentes

- **WHEN** se abre el modal de configuración
- **THEN** aparecen las secciones Cuenta, General, Tema, Instalación, Notificaciones y Calendarios

#### Scenario: Configuración abre como una capa superpuesta, no como una pantalla nueva

- **WHEN** se abre la configuración desde el panel lateral
- **THEN** se abre un modal por encima de la pantalla actual
- **AND** la pantalla de fondo permanece siendo la misma vista en la que estaba
  el usuario, en vez de navegar a una ruta separada de configuración

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

### Requirement: Sección Notificaciones

La sección Notificaciones SHALL ofrecer activar y desactivar los
recordatorios push, SHALL solicitar el permiso de notificaciones del
navegador al activarlas si todavía no fue otorgado, y SHALL mostrar y
permitir eliminar los dispositivos actualmente suscritos (tabla
`push_subscriptions`).

#### Scenario: Activar notificaciones pide permiso del navegador

- **WHEN** el usuario activa las notificaciones push desde la sección Notificaciones y el navegador todavía no otorgó el permiso
- **THEN** el navegador solicita el permiso de notificaciones
- **AND** si el usuario lo otorga, el dispositivo queda suscripto

#### Scenario: Desactivar notificaciones da de baja la suscripción de este dispositivo

- **WHEN** el usuario desactiva las notificaciones push desde este dispositivo
- **THEN** la suscripción de este dispositivo se elimina de `push_subscriptions`

#### Scenario: La sección lista los dispositivos suscritos y permite eliminarlos

- **WHEN** el usuario abre la sección Notificaciones y tiene más de un dispositivo suscrito
- **THEN** se muestra la lista de dispositivos suscritos
- **AND** cada uno ofrece una acción para eliminar esa suscripción en particular

#### Scenario: El permiso denegado por el navegador no rompe la sección

- **WHEN** el usuario deniega el permiso de notificaciones del navegador al intentar activarlas
- **THEN** la sección indica que el permiso fue denegado
- **AND** no queda ninguna suscripción creada

### Requirement: Sección Calendarios

La sección Calendarios SHALL mostrar el estado de la conexión con Google Calendar, SHALL ofrecer conectar la cuenta cuando no hay ninguna conexión, SHALL ofrecer desconectarla cuando ya existe una, y SHALL permitir elegir cuáles de los calendarios de Google conectados se muestran en Trazio.

#### Scenario: Sin conexión, la sección ofrece conectar

- **WHEN** se abre la sección Calendarios y el usuario no tiene ninguna conexión con Google
- **THEN** la sección ofrece la acción de conectar con Google

#### Scenario: Con conexión activa, la sección muestra el estado y ofrece desconectar

- **WHEN** se abre la sección Calendarios y el usuario tiene una conexión con `status = active`
- **THEN** la sección indica que la conexión está activa
- **AND** ofrece la acción de desconectarla

#### Scenario: Elegir qué calendarios se muestran

- **WHEN** el usuario tiene una conexión activa con más de un calendario de Google disponible
- **THEN** la sección permite elegir cuáles de esos calendarios se muestran en Trazio

#### Scenario: Una conexión que necesita reautenticación se distingue de una activa

- **WHEN** se abre la sección Calendarios y el estado de la conexión es `needs_reauth`
- **THEN** la sección lo indica de forma distinta al estado activo
- **AND** ofrece la acción para reconectar

