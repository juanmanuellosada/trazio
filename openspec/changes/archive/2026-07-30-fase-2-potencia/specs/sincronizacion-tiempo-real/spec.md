## MODIFIED Requirements

### Requirement: Suscripción Realtime por tabla filtrada por usuario

La aplicación SHALL mantener una suscripción de Realtime por cada una de las
tablas `tasks`, `projects`, `sections`, `comments`, `reminders` y `filters`, y
cada suscripción SHALL estar filtrada por el `user_id` de la sesión activa.
Las demás tablas de `docs/data-model.md` pertenecen a fases posteriores y no
tienen suscripción todavía.

#### Scenario: Suscripción activa sobre tasks, projects, sections, comments, reminders y filters

- **WHEN** el usuario tiene una sesión iniciada
- **THEN** la aplicación mantiene una suscripción de Realtime sobre `tasks`, `projects`, `sections`, `comments`, `reminders` y `filters`
- **AND** cada una de esas suscripciones está filtrada por el `user_id` del usuario

#### Scenario: Sin suscripción a tablas de fases posteriores

- **WHEN** se audita la configuración de Realtime de esta fase
- **THEN** no existe ninguna suscripción a `labels`, `task_labels`, `habits`, `habit_completions` ni `habit_schedule_overrides`
