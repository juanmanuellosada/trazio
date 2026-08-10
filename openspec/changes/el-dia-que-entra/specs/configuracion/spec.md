## ADDED Requirements

### Requirement: Hora en que termina el día

La sección General SHALL ofrecer un selector de la hora en que termina el
día, usada para calcular el tiempo libre restante en Hoy (capacidad
`carga-del-dia`). El default SHALL ser 22:00.

#### Scenario: El default es las 22:00

- **WHEN** una cuenta recién creada abre la sección General por primera vez
- **THEN** la hora de fin del día es 22:00

#### Scenario: Cambiar la hora de fin del día afecta el tiempo libre de Hoy

- **WHEN** se cambia la hora de fin del día y se guarda
- **THEN** el tiempo libre que muestra el encabezado de Hoy se recalcula
  contra la nueva hora
