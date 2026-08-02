## MODIFIED Requirements

### Requirement: Los tres selectores no usan controles nativos del navegador

Elegir una **fecha** o una **hora** en cualquier superficie de la aplicación NUNCA SHALL resolverse con un `<input type="date">`, un `<input type="time">`, un `<input type="datetime-local">` ni un `<select>` nativo del navegador como el control con el que el usuario interactúa. El calendario, el selector de hora y las listas de opciones SHALL ser componentes propios de la aplicación.

Esta regla NUNCA SHALL leerse como una lista cerrada de selectores: rige para el
vencimiento, la fecha límite, la prioridad, **los recordatorios, el fin de una recurrencia,
los horarios de un evento de calendario** y cualquier superficie futura que pida una fecha
o una hora.

#### Scenario: Ningún selector delega en un input nativo

- **WHEN** el usuario abre cualquier control de la aplicación para elegir una fecha o una
  hora
- **THEN** NUNCA SHALL renderizarse un `<input type="date">`, `type="time">`,
  `type="datetime-local">` ni un `<select>` nativo como el control con el que interactúa

#### Scenario: El recordatorio con fecha y hora fija usa los componentes propios

- **WHEN** el usuario elige la fecha y la hora de un recordatorio puntual
- **THEN** SHALL usar el calendario propio y el selector de hora propio de la aplicación

#### Scenario: El fin de una recurrencia usa el calendario propio

- **WHEN** el usuario elige la fecha en la que termina una serie recurrente
- **THEN** SHALL usar el calendario propio de la aplicación

#### Scenario: Los horarios de un evento usan los componentes propios

- **WHEN** el usuario elige la fecha o el horario de un evento de calendario
- **THEN** SHALL usar el calendario propio y el selector de hora propio

#### Scenario: La misma lógica de hora no se duplica

- **WHEN** dos superficies distintas ofrecen elegir una hora
- **THEN** SHALL compartir el mismo componente
- **AND** NUNCA SHALL existir una segunda copia de la lógica de formato de 12 o 24 horas ni
  de la entrada libre de hora
