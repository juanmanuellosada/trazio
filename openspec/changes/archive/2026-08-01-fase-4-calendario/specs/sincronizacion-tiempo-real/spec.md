## MODIFIED Requirements

### Requirement: Suscripción Realtime por tabla filtrada por usuario

La aplicación SHALL mantener una suscripción de Realtime, con su manejador de eventos correspondiente, por cada una de las tablas `tasks`, `projects`, `sections`, `comments`, `reminders`, `filters`, `habits` y `habit_completions`, y cada suscripción SHALL estar filtrada por el `user_id` de la sesión activa. `labels` y `task_labels` siguen sin suscripción propia, y `habit_schedule_overrides` queda deliberadamente fuera de Realtime según `docs/data-model.md`. `calendar_connections` MUST NOT replicarse por Realtime: es una decisión permanente, no una omisión pendiente de fase — los eventos de calendario no viven en la base (se piden a la API de Google en cada consulta, según fija `eventos-de-calendario`) y la fila de conexión de un usuario cambia con tan poca frecuencia que una suscripción no aporta nada.

#### Scenario: Suscripción activa sobre tasks, projects, sections, comments, reminders, filters, habits y habit_completions

- **WHEN** el usuario tiene una sesión iniciada
- **THEN** la aplicación mantiene una suscripción de Realtime, con su manejador de eventos, sobre `tasks`, `projects`, `sections`, `comments`, `reminders`, `filters`, `habits` y `habit_completions`
- **AND** cada una de esas suscripciones está filtrada por el `user_id` del usuario

#### Scenario: Sin suscripción a labels, task_labels, habit_schedule_overrides ni calendar_connections

- **WHEN** se audita la configuración de Realtime de esta fase
- **THEN** no existe ninguna suscripción a `labels`, `task_labels`, `habit_schedule_overrides` ni `calendar_connections`

#### Scenario: calendar_connections no se replica por decisión, no por omisión

- **WHEN** se audita por qué `calendar_connections` no tiene suscripción de Realtime
- **THEN** la ausencia está documentada como decisión —los eventos de calendario no viven en la base y la fila de conexión cambia con muy poca frecuencia— y no como una funcionalidad todavía no construida
