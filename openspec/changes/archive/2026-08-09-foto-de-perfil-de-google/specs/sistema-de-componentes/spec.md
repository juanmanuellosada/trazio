## ADDED Requirements

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
