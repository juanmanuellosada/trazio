## MODIFIED Requirements

### Requirement: Recurrencia: ancla de fecha solo si hay hora reconocida (E12)

La recurrencia sola NO SHALL fijar una fecha ancla: los casos 31 a 37 SHALL
producir únicamente un RRULE en `recurrence_rule`, sin que el parser invente
un `due_date` ni un `due_at`. Cuando el texto combina una regla de
recurrencia con una hora reconocida, el parser SHALL fijar `due_at` en la
próxima ocurrencia que cumple la regla, porque descartar la hora en silencio
sería perder un atributo ya reconocido, y eso el contrato no lo permite. El
RRULE SHALL guardarse en `recurrence_rule`. Que el parser no fije
`due_date`/`due_at` a partir de la recurrencia sola no significa que nadie
interprete esa regla: la capacidad `tareas-recurrentes` SHALL leerla al
completar una tarea recurrente para generar su siguiente ocurrencia, según el
ancla que determina el propio RRULE.

#### Scenario: Recurrencia sola no inventa ancla (caso 36)

- **WHEN** el texto es `Gimnasio cada lunes`
- **THEN** el título SHALL quedar en `Gimnasio`
- **AND** SHALL emitirse el RRULE `FREQ=WEEKLY;BYDAY=MO`
- **AND** ni `due_date` ni `due_at` SHALL tener valor

#### Scenario: Recurrencia con hora sí fija ancla (caso nuevo)

- **WHEN** el texto es `Gimnasio cada lunes a las 8`
- **THEN** el título SHALL quedar en `Gimnasio`
- **AND** SHALL emitirse el RRULE `FREQ=WEEKLY;BYDAY=MO`
- **AND** `due_at` SHALL resolver al próximo lunes 08:00 (R3: la hora 8 es AM)

## ADDED Requirements

### Requirement: El RRULE determina el ancla de la recurrencia (D-D)

El RRULE que produce el parser SHALL determinar también el ancla desde la que
se calcula la siguiente ocurrencia de una tarea recurrente, sin ninguna
columna ni control adicional. Una regla anclada al calendario —que declara
`BYDAY`, `BYMONTHDAY` o `BYMONTH`— SHALL anclarse en la fecha de vencimiento
original de la tarea. Una regla de intervalo puro —`FREQ` con `INTERVAL` y
sin ningún componente `BY*`— SHALL anclarse en la fecha en la que se
completó la tarea.

#### Scenario: Una regla anclada al calendario usa el vencimiento como ancla

- **WHEN** una tarea recurrente tiene el RRULE `FREQ=WEEKLY;BYDAY=MO` ("cada
  lunes")
- **THEN** la siguiente ocurrencia SHALL calcularse desde la fecha de
  vencimiento original de la tarea, no desde la fecha en la que se completó

#### Scenario: Una regla de intervalo puro usa la fecha de completado como ancla

- **WHEN** una tarea recurrente tiene el RRULE `FREQ=DAILY;INTERVAL=3` ("cada
  3 días", sin ningún componente `BY*`)
- **THEN** la siguiente ocurrencia SHALL calcularse desde la fecha en la que
  se completó la tarea, no desde su fecha de vencimiento original
