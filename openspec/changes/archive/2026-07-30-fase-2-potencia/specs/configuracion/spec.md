## MODIFIED Requirements

### Requirement: Secciones del modal de configuración en fase 1

La configuración SHALL presentarse como un modal con secciones navegables, en
vez de una pantalla propia, y SHALL incluir en esta fase las secciones
Cuenta, General, Tema, Instalación y Notificaciones. La sección Calendarios
del spec funcional SHALL NOT aparecer todavía: la conexión con Google
Calendar es fase 4.

#### Scenario: Las cinco secciones de esta fase están presentes

- **WHEN** se abre el modal de configuración
- **THEN** aparecen las secciones Cuenta, General, Tema, Instalación y Notificaciones

#### Scenario: Configuración abre como una capa superpuesta, no como una pantalla nueva

- **WHEN** se abre la configuración desde el panel lateral
- **THEN** se abre un modal por encima de la pantalla actual
- **AND** la pantalla de fondo permanece siendo la misma vista en la que estaba
  el usuario, en vez de navegar a una ruta separada de configuración

#### Scenario: Calendarios no existe todavía

- **WHEN** se recorre el modal de configuración completo
- **THEN** no hay ninguna sección de Calendarios

## ADDED Requirements

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
