## MODIFIED Requirements

### Requirement: Sección Notificaciones

La sección **"Notificaciones y recordatorios"** SHALL ofrecer activar y desactivar los
recordatorios push, SHALL solicitar el permiso de notificaciones del
navegador al activarlas si todavía no fue otorgado, y SHALL mostrar y
permitir eliminar los dispositivos actualmente suscritos (tabla
`push_subscriptions`).

La sección SHALL ofrecer además configurar la **hora de referencia**: a qué hora se
considera que vence una tarea que tiene día pero no hora. Esa hora SHALL usarse para
resolver el momento de los recordatorios relativos sobre tareas sin hora, combinándola con
el día de la tarea y la zona horaria del usuario.

Cambiar la hora de referencia SHALL aplicarse a los cálculos posteriores y NUNCA SHALL
reescribir los recordatorios ya agendados: cambiar un valor por defecto no mueve
decisiones ya tomadas.

#### Scenario: Activar notificaciones pide permiso del navegador

- **WHEN** el usuario activa las notificaciones push desde la sección y el navegador todavía no otorgó el permiso
- **THEN** el navegador solicita el permiso de notificaciones
- **AND** si el usuario lo otorga, el dispositivo queda suscripto

#### Scenario: Desactivar notificaciones da de baja la suscripción de este dispositivo

- **WHEN** el usuario desactiva las notificaciones push desde este dispositivo
- **THEN** la suscripción de este dispositivo se elimina de `push_subscriptions`

#### Scenario: La sección lista los dispositivos suscritos y permite eliminarlos

- **WHEN** el usuario abre la sección y tiene más de un dispositivo suscrito
- **THEN** se muestra la lista de dispositivos suscritos
- **AND** cada uno ofrece una acción para eliminar esa suscripción en particular

#### Scenario: El permiso denegado por el navegador no rompe la sección

- **WHEN** el usuario deniega el permiso de notificaciones del navegador al intentar activarlas
- **THEN** la sección indica que el permiso fue denegado
- **AND** no queda ninguna suscripción creada

#### Scenario: La hora de referencia se configura y se conserva

- **WHEN** el usuario cambia la hora de referencia y recarga la aplicación
- **THEN** la sección SHALL mostrar la hora elegida

#### Scenario: La hora de referencia rige los relativos sobre tareas sin hora

- **WHEN** el usuario tiene una hora de referencia configurada y agrega "un día antes" a
  una tarea que tiene día pero no hora
- **THEN** el recordatorio SHALL quedar agendado a esa hora, el día anterior

#### Scenario: Cambiarla no mueve los recordatorios ya agendados

- **WHEN** el usuario cambia la hora de referencia teniendo recordatorios relativos ya
  agendados sobre tareas sin hora
- **THEN** esos recordatorios NUNCA SHALL moverse por el solo hecho de haber cambiado la
  preferencia
- **AND** SHALL recalcularse con la hora nueva recién cuando su tarea cambie de día
