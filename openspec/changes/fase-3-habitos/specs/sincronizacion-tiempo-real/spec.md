## MODIFIED Requirements

### Requirement: Suscripción Realtime por tabla filtrada por usuario

La aplicación SHALL mantener una suscripción de Realtime, con su manejador de eventos correspondiente, por cada una de las tablas `tasks`, `projects`, `sections`, `comments`, `reminders`, `filters`, `habits` y `habit_completions`, y cada suscripción SHALL estar filtrada por el `user_id` de la sesión activa. `labels` y `task_labels` siguen sin suscripción propia, `habit_schedule_overrides` queda deliberadamente fuera de Realtime según `docs/data-model.md`, y `calendar_connections` pertenece a la fase 4 y todavía no tiene suscripción.

#### Scenario: Suscripción activa sobre tasks, projects, sections, comments, reminders, filters, habits y habit_completions

- **WHEN** el usuario tiene una sesión iniciada
- **THEN** la aplicación mantiene una suscripción de Realtime, con su manejador de eventos, sobre `tasks`, `projects`, `sections`, `comments`, `reminders`, `filters`, `habits` y `habit_completions`
- **AND** cada una de esas suscripciones está filtrada por el `user_id` del usuario

#### Scenario: Sin suscripción a labels, task_labels, habit_schedule_overrides ni calendar_connections

- **WHEN** se audita la configuración de Realtime de esta fase
- **THEN** no existe ninguna suscripción a `labels`, `task_labels`, `habit_schedule_overrides` ni `calendar_connections`
