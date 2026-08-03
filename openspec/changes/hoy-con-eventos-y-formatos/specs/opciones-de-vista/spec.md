## MODIFIED Requirements

### Requirement: Forma de ver, solo donde existe modo panel

La barra SHALL ofrecer un selector de forma de ver con los valores "lista", "panel" y "calendario" en las pantallas donde `modo-panel` está disponible: Bandeja, Proyecto, Próximos y **Hoy**. En Etiqueta y Filtro, donde no hay modo panel, la barra MUST NOT mostrar el selector de forma de ver.

#### Scenario: El selector aparece en Proyecto

- **WHEN** el usuario abre la barra de opciones de vista de un proyecto
- **THEN** ve un selector de forma de ver con los valores "lista", "panel" y "calendario"

#### Scenario: El selector aparece en Hoy

- **WHEN** el usuario abre la barra de opciones de vista de Hoy
- **THEN** ve un selector de forma de ver con los valores "lista", "panel" y "calendario"

#### Scenario: El selector no aparece en Etiqueta

- **WHEN** el usuario abre la barra de opciones de vista de una etiqueta
- **THEN** no ve ningún selector de forma de ver

#### Scenario: Calendario es una forma de ver posible

- **WHEN** el usuario abre el selector de forma de ver
- **THEN** "calendario" está entre los valores disponibles

### Requirement: Formato de calendario, solo cuando la forma de ver es calendario

La barra SHALL ofrecer el control "formato de calendario", con los valores día, cuatro días, semana y mes, únicamente cuando la forma de ver activa es "calendario". Las demás formas de ver MUST NOT mostrar este control.

En **Hoy** el control MUST NOT aparecer nunca, ni siquiera con la forma de ver en "calendario": esa pantalla es un solo día y los otros tres formatos no significan nada ahí. El control tampoco SHALL mostrarse deshabilitado, porque un control apagado invita a buscar cómo encenderlo.

#### Scenario: El control aparece solo con la forma de ver calendario

- **WHEN** el usuario cambia la forma de ver a "calendario" en Bandeja, Proyecto o Próximos
- **THEN** la barra de opciones de vista muestra el control de formato de calendario con los valores día, cuatro días, semana y mes

#### Scenario: El control no aparece en lista ni en panel

- **WHEN** la forma de ver activa es "lista" o "panel"
- **THEN** la barra de opciones de vista no muestra el control de formato de calendario

#### Scenario: En Hoy el control no aparece ni con la forma de ver calendario

- **WHEN** el usuario pone la forma de ver de Hoy en "calendario"
- **THEN** la barra de opciones de vista NUNCA SHALL mostrar el control de formato de calendario
- **AND** NUNCA SHALL mostrarlo deshabilitado
