## ADDED Requirements

### Requirement: Un cliente MCP se registra sin intervención manual del usuario

El servidor OAuth de Trazio SHALL tener habilitado el registro dinámico de
clientes (`allow_dynamic_registration`), de forma que un cliente MCP pueda
darse de alta por sí mismo antes de pedir autorización, sin que el usuario
tenga que crear ni configurar nada a mano.

#### Scenario: Un cliente nuevo se registra solo

- **WHEN** un cliente MCP que nunca se conectó antes inicia el flujo de
  autorización
- **THEN** SHALL poder registrarse automáticamente y obtener un `client_id`
- **AND** el usuario NUNCA SHALL necesitar crear ni pegar ninguna credencial
  a mano para que el registro ocurra

### Requirement: La pantalla de consentimiento muestra qué cliente pide acceso, antes de aprobar

Trazio SHALL ofrecer una pantalla de consentimiento propia en
`/oauth/consent`, que lee el `authorization_id` de la query, obtiene los
detalles de la autorización pendiente y muestra qué aplicación está pidiendo
acceso a la cuenta antes de permitir aprobar o rechazar.

#### Scenario: Se muestra el cliente que pide acceso

- **WHEN** se abre `/oauth/consent` con un `authorization_id` válido y con
  sesión iniciada
- **THEN** la pantalla SHALL mostrar qué aplicación está pidiendo conectarse

#### Scenario: Aprobar completa la conexión

- **WHEN** se aprueba la autorización pendiente desde la pantalla de
  consentimiento
- **THEN** el cliente SHALL recibir su token de acceso
- **AND** la conexión SHALL aparecer en "Aplicaciones conectadas"

#### Scenario: Rechazar no deja ninguna conexión activa

- **WHEN** se rechaza la autorización pendiente desde la pantalla de
  consentimiento
- **THEN** NUNCA SHALL emitirse ningún token para ese cliente
- **AND** la aplicación NUNCA SHALL aparecer en "Aplicaciones conectadas"

#### Scenario: Un `authorization_id` inválido o vencido no aprueba nada

- **WHEN** se abre `/oauth/consent` con un `authorization_id` que no existe o
  ya venció
- **THEN** la pantalla SHALL indicar que no se puede continuar
- **AND** NUNCA SHALL emitirse ningún token

### Requirement: La pantalla de consentimiento advierte la limitación del acceso

Antes de aprobar una conexión, la pantalla de consentimiento SHALL advertir
que la aplicación autorizada va a poder acceder a la cuenta con los mismos
permisos que el propio usuario, sin acotarse a una parte de los datos. NUNCA
SHALL enterrarse esa advertencia en un texto secundario ni en letra chica.

#### Scenario: La advertencia se ve al aprobar

- **WHEN** se abre la pantalla de consentimiento para aprobar una conexión
- **THEN** SHALL mostrarse, de forma visible, que la aplicación va a acceder
  a la cuenta con el mismo alcance que el usuario

### Requirement: Aplicaciones conectadas lista y revoca cada conexión

Configuración SHALL ofrecer una sección "Aplicaciones conectadas" que lista
cada aplicación autorizada por el usuario, y SHALL ofrecer revocar cada una
individualmente.

#### Scenario: Se listan las aplicaciones conectadas

- **WHEN** se abre "Aplicaciones conectadas" y hay al menos una conexión
  activa
- **THEN** SHALL verse cada aplicación conectada

#### Scenario: Revocar corta el acceso de inmediato

- **WHEN** se revoca una aplicación conectada desde esta sección
- **THEN** el token de esa aplicación NUNCA SHALL volver a servir para leer
  ni escribir la cuenta
- **AND** esa aplicación NUNCA SHALL seguir apareciendo como conectada

#### Scenario: Sin conexiones, la sección lo dice sin dejarla en blanco

- **WHEN** se abre "Aplicaciones conectadas" sin ninguna conexión activa
- **THEN** la sección SHALL indicar que no hay ninguna aplicación conectada,
  siguiendo el criterio de estados vacíos de `.claude/rules/copy.md`
