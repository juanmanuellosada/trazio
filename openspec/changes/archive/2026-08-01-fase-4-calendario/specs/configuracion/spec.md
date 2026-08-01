## MODIFIED Requirements

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

## ADDED Requirements

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
