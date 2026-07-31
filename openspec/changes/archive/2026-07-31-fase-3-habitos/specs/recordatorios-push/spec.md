## MODIFIED Requirements

### Requirement: Badge del ícono con los pendientes del día

El ícono de la aplicación SHALL mostrar un badge con la cantidad de pendientes del día, sumando los recordatorios de hoy aún no entregados y los hábitos pendientes de hoy —los que tocan hoy y todavía no fueron marcados—; el spec funcional pidió esta suma desde el inicio, y esta fase corrige que el badge, desde la fase 2, contaba solo recordatorios.

#### Scenario: El badge suma recordatorios y hábitos pendientes de hoy

- **WHEN** la persona usuaria tiene tres recordatorios programados para hoy aún no entregados y dos hábitos que tocan hoy sin marcar
- **THEN** el badge del ícono de la aplicación muestra el número 5
