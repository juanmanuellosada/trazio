## MODIFIED Requirements

### Requirement: Solo las siete tablas de fase 1

El esquema SHALL haber creado exactamente siete tablas en la fase 1: `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels` y `task_labels`. La fase 2 agregó cinco tablas más: `comments`, `reminders`, `push_subscriptions`, `filters` y `view_preferences`, para un total de doce. La fase 3 agregó tres tablas más: `habits`, `habit_completions` y `habit_schedule_overrides`, para un total de quince. Esta fase agrega la última tabla descrita en `docs/data-model.md`, `calendar_connections`, con `user_id` como clave primaria y su RLS creada en la misma migración, para un total de dieciséis.

#### Scenario: El esquema remoto contiene las tablas de fase 1, 2, 3 y 4

- **WHEN** se listan las tablas del esquema `public` tras aplicar todas las migraciones de esta fase
- **THEN** existen `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels`, `task_labels`, `comments`, `reminders`, `push_subscriptions`, `filters`, `view_preferences`, `habits`, `habit_completions`, `habit_schedule_overrides` y `calendar_connections`

### Requirement: Replicación de Realtime en las tablas de fase 1

El esquema SHALL habilitar la replicación de Realtime sobre `tasks`, `projects`, `sections`, `labels`, `task_labels`, `comments`, `reminders`, `filters`, `habits` y `habit_completions`. `calendar_connections` MUST NOT sumarse a esta publicación: `sincronizacion-tiempo-real` fija que no se replica.

#### Scenario: Las tablas de fase 1 están en la publicación de Realtime

- **WHEN** se inspecciona la publicación de Realtime tras aplicar las migraciones de esta fase
- **THEN** `tasks`, `projects`, `sections`, `labels`, `task_labels`, `comments`, `reminders`, `filters`, `habits` y `habit_completions` están incluidas en la publicación
- **AND** `calendar_connections` no está incluida

## ADDED Requirements

### Requirement: Migración de calendar_connections

La migración que crea `calendar_connections` SHALL declarar `user_id uuid` como clave primaria, con foreign key hacia `auth.users(id)` y `ON DELETE CASCADE`, `provider text NOT NULL` con default `'google'`, `refresh_token text NOT NULL`, `enabled_calendar_ids text[]` y `status text NOT NULL` restringido mediante check constraint a `active` o `needs_reauth`, con default `active`. `refresh_token` SHALL guardar únicamente el resultado de cifrarlo con AES-256-GCM —el ciphertext junto con su nonce y su tag de autenticación—, cifrado y descifrado exclusivamente del lado servidor con la clave de 32 bytes de la decisión D-A de `openspec/changes/fase-4-calendario/design.md`, y MUST NOT guardarse en texto plano bajo ninguna circunstancia. La misma migración SHALL habilitar RLS y declarar sus cuatro políticas con `(select auth.uid()) = user_id`.

#### Scenario: calendar_connections nace con user_id como clave primaria, su check de status y su RLS

- **WHEN** se inspecciona la migración que crea `calendar_connections`
- **THEN** la clave primaria es `user_id`, con foreign key hacia `auth.users(id)` y `ON DELETE CASCADE`
- **AND** existe un check constraint que restringe `status` a `active` o `needs_reauth`
- **AND** la misma migración habilita RLS y declara las cuatro políticas de select, insert, update y delete con `(select auth.uid()) = user_id`

#### Scenario: El refresh token nunca se guarda en claro

- **WHEN** se inspecciona el valor guardado en la columna `refresh_token` de cualquier fila de `calendar_connections`
- **THEN** el valor es el ciphertext de AES-256-GCM con su nonce y su tag de autenticación, nunca el token de Google en texto plano
- **AND** el descifrado solo ocurre del lado servidor, en el momento de refrescar el access token
