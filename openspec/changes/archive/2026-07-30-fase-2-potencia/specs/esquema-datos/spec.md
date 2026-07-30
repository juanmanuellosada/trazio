## MODIFIED Requirements

### Requirement: Solo las siete tablas de fase 1

El esquema SHALL haber creado exactamente siete tablas en la fase 1:
`profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels` y
`task_labels`. Esta fase agrega cinco tablas más: `comments`, `reminders`,
`push_subscriptions`, `filters` y `view_preferences`, para un total de doce.
Las tablas restantes descritas en `docs/data-model.md` (`habits`,
`habit_completions`, `habit_schedule_overrides`, `calendar_connections`)
pertenecen a fases posteriores y MUST NOT crearse vacías por adelantado.

#### Scenario: El esquema remoto contiene las tablas de fase 1 y de esta fase

- **WHEN** se listan las tablas del esquema `public` tras aplicar todas las migraciones de esta fase
- **THEN** existen `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels`, `task_labels`, `comments`, `reminders`, `push_subscriptions`, `filters` y `view_preferences`
- **AND** no existe ninguna de las tablas de fases posteriores (`habits`, `habit_completions`, `habit_schedule_overrides`, `calendar_connections`)

### Requirement: Índices de fase 1

El esquema SHALL crear, junto con la columna que los necesita, los índices:
`user_id` en cada una de las tablas de fase 1, `(user_id, due_date)`,
`(user_id, due_at)`, `(user_id, project_id, position)`, `(user_id, completed_at)` y
`(parent_id)` sobre `tasks`. Esta fase agrega el índice GIN sobre
`tasks.search_vector` — la columna generada que usa la configuración de
búsqueda `spanish_unaccent` — y el índice parcial sobre
`reminders(remind_at) where delivered_at is null`, el que usa el cron de
recordatorios para no escanear la tabla entera cada minuto.

#### Scenario: Los índices de tasks existen

- **WHEN** se listan los índices de la tabla `tasks` tras aplicar las migraciones
- **THEN** existen índices sobre `(user_id, due_date)`, `(user_id, due_at)`, `(user_id, project_id, position)`, `(user_id, completed_at)` y `(parent_id)`

#### Scenario: Cada tabla tiene índice en user_id

- **WHEN** se listan los índices de `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels` y `task_labels`
- **THEN** cada tabla tiene al menos un índice que cubre `user_id`

#### Scenario: Existe el índice GIN de búsqueda sobre search_vector

- **WHEN** se listan los índices de `tasks` tras aplicar las migraciones de esta fase
- **THEN** existe un índice GIN sobre la columna generada `search_vector`

### Requirement: Defaults y enumeraciones de fase 1

`tasks.priority` SHALL tener default `4` (Baja). `tasks.completed_at` SHALL tener
default `NULL`. `user_preferences.date_format` SHALL aceptar únicamente
`'dd/MM/yyyy'` (default) o `'yyyy-MM-dd'`, validado por check constraint.
`user_preferences.default_view` SHALL aceptar `'bandeja'` (default), `'hoy'` o
`'proximos'`. `user_preferences.timezone` SHALL tener default
`'America/Argentina/Buenos_Aires'`. `user_preferences.theme` SHALL tener default
`'system'`. `user_preferences.time_format` SHALL tener default `24`.
`user_preferences.week_starts_on` SHALL tener default `1` (lunes).
`projects.color` SHALL restringirse a una paleta fija mediante check constraint,
no a texto libre.

#### Scenario: Los defaults de tasks se aplican al insertar

- **WHEN** se inserta una tarea sin especificar `priority` ni `completed_at`
- **THEN** `priority` queda en `4`
- **AND** `completed_at` queda en `NULL`

#### Scenario: Los defaults de user_preferences se aplican al aprovisionar la cuenta

- **WHEN** se crea la fila de `user_preferences` de un usuario nuevo vía el trigger de aprovisionamiento
- **THEN** `timezone` es `'America/Argentina/Buenos_Aires'`, `theme` es `'system'`, `time_format` es `24`, `week_starts_on` es `1`, `date_format` es `'dd/MM/yyyy'` y `default_view` es `'bandeja'`

#### Scenario: Valores fuera de la enumeración se rechazan

- **WHEN** se intenta guardar `date_format`, `default_view`, `theme`, `time_format`, `week_starts_on` o `color` de un proyecto con un valor fuera de su enumeración o paleta permitida
- **THEN** la base de datos rechaza la operación por violación de check constraint

#### Scenario: proximos es un valor aceptado para default_view

- **WHEN** se intenta guardar `user_preferences.default_view` en `'proximos'`
- **THEN** la operación se completa sin error

### Requirement: Replicación de Realtime en las tablas de fase 1

El esquema SHALL habilitar la replicación de Realtime sobre `tasks`, `projects`, `sections`, `labels`, `task_labels`, `comments`, `reminders` y `filters`.

#### Scenario: Las tablas de fase 1 están en la publicación de Realtime

- **WHEN** se inspecciona la publicación de Realtime tras aplicar las migraciones de esta fase
- **THEN** `tasks`, `projects`, `sections`, `labels`, `task_labels`, `comments`, `reminders` y `filters` están incluidas en la publicación

## ADDED Requirements

### Requirement: Extensiones para búsqueda insensible a acentos y para el cron de recordatorios

Una migración propia, sin cambios de esquema de tablas, SHALL crear la
extensión `unaccent` y la configuración de búsqueda `spanish_unaccent`
(`copy = spanish`, con la asignación de `hword`, `hword_part` y `word`
alterada para pasar por `unaccent` y luego por `spanish_stem`). La misma
tanda de migraciones SHALL habilitar las extensiones `pg_cron` y `pg_net`,
necesarias para programar y ejecutar la entrega de recordatorios.

#### Scenario: La extensión unaccent y la configuración spanish_unaccent existen

- **WHEN** se inspecciona el esquema tras aplicar las migraciones de esta fase
- **THEN** la extensión `unaccent` está instalada
- **AND** existe una configuración de búsqueda de texto llamada `spanish_unaccent`

#### Scenario: pg_cron y pg_net están habilitadas

- **WHEN** se listan las extensiones instaladas tras aplicar las migraciones de esta fase
- **THEN** `pg_cron` y `pg_net` están entre ellas

### Requirement: Columna de búsqueda generada en tasks

`tasks` SHALL ganar una columna `description_text text` nullable, que la
aplicación escribe en el mismo `update` que la descripción. `tasks` SHALL
ganar además una columna generada `search_vector` sobre
`to_tsvector('spanish_unaccent', title || ' ' || coalesce(description_text, ''))`,
que depende de que la configuración `spanish_unaccent` ya exista.

#### Scenario: search_vector se recalcula automáticamente

- **WHEN** se actualiza el `title` o el `description_text` de una tarea
- **THEN** la columna generada `search_vector` se recalcula automáticamente, sin que la aplicación la escriba directamente

#### Scenario: search_vector es insensible a acentos por la configuración spanish_unaccent

- **WHEN** se compara el `search_vector` de una tarea titulada "Reunión" contra la búsqueda de texto "reunion" (sin tilde), usando la configuración `spanish_unaccent`
- **THEN** ambos coinciden, porque la configuración normaliza el acento antes de indexar

### Requirement: Migración de comments

La migración que crea `comments` SHALL declarar `id` como clave primaria,
`user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`,
`task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE`, `content
jsonb` (documento de Tiptap) y `created_at` / `updated_at timestamptz`. La
misma migración SHALL habilitar RLS, declarar sus cuatro políticas con
`(select auth.uid()) = user_id`, y crear un índice en `user_id` y otro en
`task_id`.

#### Scenario: comments nace con su cascada, su RLS y su índice por tarea

- **WHEN** se inspecciona la migración que crea `comments`
- **THEN** `task_id` tiene foreign key hacia `tasks` con `ON DELETE CASCADE`
- **AND** la misma migración habilita RLS y declara las cuatro políticas con `(select auth.uid()) = user_id`
- **AND** existe un índice sobre `task_id`

#### Scenario: Borrar una tarea borra sus comentarios

- **WHEN** se elimina una fila de `tasks`
- **THEN** se eliminan en cascada todas las filas de `comments` que apuntaban a esa tarea

### Requirement: Migración de reminders

La migración que crea `reminders` SHALL declarar `id` como clave primaria,
`user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`,
`task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE`, `remind_at
timestamptz NOT NULL`, `offset_minutes integer` nullable y `delivered_at
timestamptz` nullable con default `NULL`. La misma migración SHALL habilitar
RLS, declarar sus cuatro políticas con `(select auth.uid()) = user_id`, y
crear el índice parcial sobre `remind_at` donde `delivered_at is null`.

#### Scenario: reminders nace con su cascada, su RLS y su índice parcial

- **WHEN** se inspecciona la migración que crea `reminders`
- **THEN** `task_id` tiene foreign key hacia `tasks` con `ON DELETE CASCADE`
- **AND** la misma migración habilita RLS y declara las cuatro políticas con `(select auth.uid()) = user_id`
- **AND** existe un índice parcial sobre `remind_at` con la condición `delivered_at is null`

#### Scenario: Borrar una tarea borra sus recordatorios

- **WHEN** se elimina una fila de `tasks`
- **THEN** se eliminan en cascada todas las filas de `reminders` que apuntaban a esa tarea

### Requirement: Migración de push_subscriptions

La migración que crea `push_subscriptions` SHALL declarar `id` como clave
primaria, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE
CASCADE`, `endpoint text` único, `p256dh text`, `auth text` y `created_at
timestamptz`. La misma migración SHALL habilitar RLS y declarar sus cuatro
políticas con `(select auth.uid()) = user_id`.

#### Scenario: push_subscriptions nace con endpoint único y su RLS

- **WHEN** se inspecciona la migración que crea `push_subscriptions`
- **THEN** existe un constraint de unicidad sobre `endpoint`
- **AND** la misma migración habilita RLS y declara las cuatro políticas con `(select auth.uid()) = user_id`

#### Scenario: No se puede repetir el mismo endpoint

- **WHEN** se intenta insertar dos filas en `push_subscriptions` con el mismo `endpoint`
- **THEN** la base de datos rechaza la segunda inserción por violación del constraint de unicidad

### Requirement: Migración de filters

La migración que crea `filters` SHALL declarar `id` como clave primaria,
`user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `name
text`, `query text` (la consulta guardada tal cual, sin parsear), `color`
restringido a la misma paleta fija que `projects.color` y `labels.color`
mediante check constraint (con la misma salida de color personalizado
validado por contraste que ya admite `projects.color`), `icon text` e
`is_favorite boolean`. La misma migración SHALL habilitar RLS y declarar sus
cuatro políticas con `(select auth.uid()) = user_id`.

#### Scenario: filters nace con su color restringido a la paleta fija y su RLS

- **WHEN** se inspecciona la migración que crea `filters`
- **THEN** existe un check constraint que restringe `color` a la misma paleta fija que `projects.color`
- **AND** la misma migración habilita RLS y declara las cuatro políticas con `(select auth.uid()) = user_id`

#### Scenario: Un color de filtro fuera de la paleta o sin contraste se rechaza

- **WHEN** se intenta guardar un `color` de `filters` que no es ni un identificador de la paleta fija ni un color personalizado válido
- **THEN** la base de datos rechaza la operación por violación de check constraint

### Requirement: Migración de view_preferences

La migración que crea `view_preferences` SHALL declarar una clave primaria
compuesta `(user_id, view_key)` — sin columna `id` propia, a diferencia del
resto de las tablas del esquema —, `user_id uuid NOT NULL REFERENCES
auth.users(id) ON DELETE CASCADE`, `view_key text` y `options jsonb`. `view_key`
NO SHALL declararse como foreign key hacia `projects`, `labels` ni `filters`:
sus valores (`bandeja`, `hoy`, `proximos`, `proyecto:<id>`, `etiqueta:<id>`,
`filtro:<id>`) son texto libre compuesto en la aplicación. La misma migración
SHALL habilitar RLS y declarar sus cuatro políticas con `(select auth.uid())
= user_id`.

#### Scenario: view_preferences nace con su clave compuesta y su RLS

- **WHEN** se inspecciona la migración que crea `view_preferences`
- **THEN** la clave primaria es la combinación de `user_id` y `view_key`
- **AND** la misma migración habilita RLS y declara las cuatro políticas con `(select auth.uid()) = user_id`

#### Scenario: Filas huérfanas de un proyecto, etiqueta o filtro eliminado no rompen la lectura

- **WHEN** existe una fila de `view_preferences` cuya `view_key` referencia un proyecto, una etiqueta o un filtro que ya fue eliminado
- **THEN** esa fila sigue existiendo sin error, porque no hay foreign key que la valide
- **AND** la aplicación la ignora al leer, sin que la ausencia del recurso referenciado rompa ninguna otra vista
