# esquema-datos Specification

## Purpose
TBD - created by archiving change fase-1-base-usable. Update Purpose after archive.
## Requirements
### Requirement: Solo las siete tablas de fase 1

El esquema SHALL haber creado exactamente siete tablas en la fase 1: `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels` y `task_labels`. La fase 2 agregó cinco tablas más: `comments`, `reminders`, `push_subscriptions`, `filters` y `view_preferences`, para un total de doce. La fase 3 agregó tres tablas más: `habits`, `habit_completions` y `habit_schedule_overrides`, para un total de quince. Esta fase agrega la última tabla descrita en `docs/data-model.md`, `calendar_connections`, con `user_id` como clave primaria y su RLS creada en la misma migración, para un total de dieciséis.

#### Scenario: El esquema remoto contiene las tablas de fase 1, 2, 3 y 4

- **WHEN** se listan las tablas del esquema `public` tras aplicar todas las migraciones de esta fase
- **THEN** existen `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels`, `task_labels`, `comments`, `reminders`, `push_subscriptions`, `filters`, `view_preferences`, `habits`, `habit_completions`, `habit_schedule_overrides` y `calendar_connections`

### Requirement: Migración de labels

La migración que crea `labels` SHALL declarar `id` como clave primaria, `user_id
uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `name` único por
usuario, `color` restringido a la paleta fija mediante check constraint (la misma
paleta que `projects.color`) e `is_favorite boolean`, columna que existe desde esta
fase aunque la funcionalidad de favoritos sea de fase 2. La misma migración SHALL
habilitar RLS, declarar sus cuatro políticas con `(select auth.uid()) = user_id` y
crear un índice en `user_id`.

#### Scenario: La tabla labels nace completa en una sola migración

- **WHEN** se inspecciona la migración que crea `labels`
- **THEN** `user_id` es `uuid`, `NOT NULL`, con foreign key hacia `auth.users(id)` y `ON DELETE CASCADE`
- **AND** existe un constraint que impide repetir `name` para el mismo `user_id`
- **AND** existe un check constraint que restringe `color` a la paleta fija
- **AND** la misma migración habilita RLS, declara las cuatro políticas de select, insert, update y delete con `(select auth.uid()) = user_id`, y crea un índice en `user_id`

#### Scenario: No se puede repetir el nombre de una etiqueta para el mismo usuario

- **WHEN** se intenta insertar dos filas en `labels` con el mismo `user_id` y el mismo `name`
- **THEN** la base de datos rechaza la segunda inserción por violación del constraint de unicidad

#### Scenario: El color de una etiqueta está restringido a la paleta fija

- **WHEN** se intenta insertar o actualizar una fila de `labels` con un `color` fuera de la paleta fija
- **THEN** la base de datos rechaza la operación por violación de check constraint

### Requirement: Migración de task_labels

La migración que crea `task_labels` SHALL declarar una clave primaria compuesta
`(task_id, label_id)`, con `task_id` como foreign key hacia `tasks` y `label_id`
como foreign key hacia `labels`, ambas con `ON DELETE CASCADE`, más una columna
`user_id` propia — no derivada por join — para que la política de RLS sea una sola
comparación directa sin navegar `tasks` ni `labels`, según la decisión D11. La
misma migración SHALL habilitar RLS y declarar sus cuatro políticas con `(select
auth.uid()) = user_id`.

#### Scenario: task_labels nace con su clave compuesta, sus cascadas y su RLS

- **WHEN** se inspecciona la migración que crea `task_labels`
- **THEN** la clave primaria es la combinación de `task_id` y `label_id`
- **AND** `task_id` tiene foreign key hacia `tasks` con `ON DELETE CASCADE`
- **AND** `label_id` tiene foreign key hacia `labels` con `ON DELETE CASCADE`
- **AND** la tabla tiene su propia columna `user_id`
- **AND** la misma migración habilita RLS y declara las cuatro políticas con `(select auth.uid()) = user_id`

#### Scenario: Borrar una tarea quita sus asignaciones de etiquetas

- **WHEN** se elimina una fila de `tasks`
- **THEN** se eliminan en cascada todas las filas de `task_labels` que apuntaban a esa tarea

### Requirement: Borrar una etiqueta la quita de todas las tareas

La cascada `ON DELETE CASCADE` de `label_id` en `task_labels` SHALL quitar una
etiqueta eliminada de todas las tareas que la tenían asignada, sin requerir
lógica adicional en la aplicación.

#### Scenario: Borrar una etiqueta la desasigna de todas las tareas

- **WHEN** se elimina una fila de `labels`
- **THEN** se eliminan en cascada todas las filas de `task_labels` que apuntaban a esa etiqueta
- **AND** las tareas que la tenían asignada dejan de mostrarla, y ninguna de esas tareas se elimina

### Requirement: RLS habilitado en la misma migración que crea la tabla

Toda tabla de esta fase SHALL habilitar row level security
(`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) y declarar sus cuatro políticas
(`select`, `insert`, `update`, `delete`) en la MISMA migración SQL que la crea. Las
cuatro políticas SHALL usar `(select auth.uid()) = user_id`, nunca `auth.uid()` a
secas: envolver la llamada en un subselect permite que Postgres la evalúe una vez
por consulta en lugar de una vez por fila, lo que cambia el plan de ejecución en
tablas grandes.

#### Scenario: Cada tabla nace con RLS y sus cuatro políticas

- **WHEN** se inspecciona la migración que crea `projects`, `sections` o `tasks`
- **THEN** esa misma migración contiene `ENABLE ROW LEVEL SECURITY` para la tabla
- **AND** esa misma migración crea las cuatro políticas de select, insert, update y delete
- **AND** las cuatro políticas usan la expresión `(select auth.uid()) = user_id`

#### Scenario: Ninguna migración deja una tabla sin RLS

- **WHEN** se revisan todas las migraciones de `supabase/migrations/` de esta fase
- **THEN** no existe ninguna migración que cree una tabla con `user_id` sin habilitar RLS en el mismo archivo

### Requirement: user_id obligatorio con FK en cascada

Toda tabla con datos de usuario de esta fase SHALL declarar
`user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.

#### Scenario: user_id es NOT NULL con cascada hacia auth.users

- **WHEN** se inspecciona la definición de columnas de `profiles`, `user_preferences`, `projects`, `sections` y `tasks`
- **THEN** cada una tiene una columna `user_id` de tipo `uuid`, `NOT NULL`, con foreign key hacia `auth.users(id)` y `ON DELETE CASCADE`

#### Scenario: Borrar el usuario borra sus datos

- **WHEN** se elimina una fila de `auth.users`
- **THEN** se eliminan en cascada todas las filas de `profiles`, `user_preferences`, `projects`, `sections` y `tasks` que le pertenecían

### Requirement: due_date y due_at son excluyentes

Una tarea SHALL tener a lo sumo uno de `due_date` (tipo `date`) y `due_at` (tipo
`timestamptz`) con valor no nulo. Un constraint de base de datos SHALL rechazar
cualquier fila donde ambas columnas tengan valor simultáneamente.

#### Scenario: No se puede insertar una tarea con ambas fechas

- **WHEN** se intenta insertar o actualizar una fila de `tasks` con `due_date` y `due_at` distintos de `NULL` a la vez
- **THEN** la base de datos rechaza la operación por violación de constraint

#### Scenario: Una tarea puede tener una sola de las dos, o ninguna

- **WHEN** se inserta una tarea con solo `due_date`, o solo `due_at`, o ninguna de las dos
- **THEN** la inserción se completa sin error

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

### Requirement: Trigger de aprovisionamiento de cuenta

Un trigger sobre `auth.users` (evento `insert`) SHALL crear, en una única
transacción, las filas iniciales de `profiles`, `user_preferences` y el proyecto
Bandeja de entrada en `projects`. El proyecto Bandeja SHALL crearse con
`name = 'Bandeja de entrada'`, `is_inbox = true`, `color = '#283B56'`,
`icon = NULL`, `position = 0` y `parent_id = NULL`.

#### Scenario: Registrarse crea perfil, preferencias y Bandeja

- **WHEN** se inserta una fila nueva en `auth.users`
- **THEN** se crea automáticamente una fila en `profiles` para ese usuario
- **AND** se crea automáticamente una fila en `user_preferences` para ese usuario
- **AND** se crea automáticamente un proyecto en `projects` con `is_inbox = true`, `name = 'Bandeja de entrada'`, `color = '#283B56'`, `icon = NULL`, `position = 0` y `parent_id = NULL`

#### Scenario: El aprovisionamiento es atómico

- **WHEN** cualquiera de las tres inserciones del trigger de aprovisionamiento falla
- **THEN** ninguna de las tres filas queda creada (no hay perfil sin preferencias, ni preferencias sin Bandeja)

### Requirement: Protección de la Bandeja de entrada a nivel de base de datos

SHALL existir un índice único parcial que garantice un solo `is_inbox = true` por
usuario en `projects`. SHALL existir además un trigger `before delete or update`
sobre `projects` que rechace: borrar la Bandeja, archivarla (`is_archived = true`)
o quitarle `is_inbox` (pasarlo a `false`).

#### Scenario: No puede haber dos Bandejas para el mismo usuario

- **WHEN** se intenta insertar o actualizar un segundo proyecto con `is_inbox = true` para un usuario que ya tiene uno
- **THEN** la base de datos rechaza la operación por violación del índice único parcial

#### Scenario: La Bandeja no se puede borrar

- **WHEN** se intenta ejecutar un `DELETE` sobre la fila de `projects` donde `is_inbox = true`
- **THEN** el trigger rechaza la operación

#### Scenario: La Bandeja no se puede archivar ni perder su is_inbox

- **WHEN** se intenta hacer `UPDATE` sobre la fila de la Bandeja para poner `is_archived = true`, o para poner `is_inbox = false`
- **THEN** el trigger rechaza la operación en ambos casos

### Requirement: Anidamiento de proyectos limitado a 3 niveles y sin ciclos

Un constraint o trigger SHALL impedir que un proyecto se anide a más de 3 niveles
de profundidad respecto de su ancestro raíz. Un constraint o trigger SHALL impedir
que un proyecto sea su propio ancestro (directo o indirecto, vía `parent_id`).

#### Scenario: Se rechaza un cuarto nivel de anidamiento

- **WHEN** se intenta crear un proyecto hijo de un proyecto que ya está en el tercer nivel de profundidad
- **THEN** la base de datos rechaza la operación

#### Scenario: Se rechaza un proyecto que es su propio ancestro

- **WHEN** se intenta actualizar `parent_id` de un proyecto para que apunte a sí mismo, o a un descendiente suyo
- **THEN** la base de datos rechaza la operación

### Requirement: Borrado en cascada de secciones, tareas huérfanas al borrar sección

`sections.project_id` SHALL declararse `ON DELETE CASCADE` respecto de `projects`.
`tasks.section_id` SHALL declararse `ON DELETE SET NULL` respecto de `sections`.

#### Scenario: Borrar un proyecto borra sus secciones y tareas

- **WHEN** se elimina una fila de `projects`
- **THEN** se eliminan en cascada todas las secciones cuyo `project_id` apuntaba a ese proyecto
- **AND** se eliminan en cascada todas las tareas cuyo `project_id` apuntaba a ese proyecto

#### Scenario: Borrar una sección no borra sus tareas

- **WHEN** se elimina una fila de `sections`
- **THEN** las tareas que tenían esa sección quedan con `section_id = NULL`
- **AND** esas tareas siguen existiendo dentro del mismo proyecto

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

### Requirement: Reordenamiento con position numeric y rebalanceo

`position` SHALL ser `numeric` en `projects`, `sections` y `tasks`. Al insertar
hermanos por primera vez, el espaciado inicial SHALL ser de 1000 entre elementos
consecutivos. Cuando la diferencia de `position` entre dos hermanos vecinos baje de
`0.0001`, una función SHALL rebalancear las posiciones de todos los hermanos de ese
mismo padre en una única transacción.

#### Scenario: El espaciado inicial es de 1000

- **WHEN** se insertan varios hermanos nuevos sin reordenar
- **THEN** sus valores de `position` quedan espaciados en incrementos de 1000

#### Scenario: Insertar entre dos vecinos usa el promedio

- **WHEN** se inserta un elemento entre dos hermanos existentes
- **THEN** su `position` es el promedio de los `position` de ambos vecinos

#### Scenario: Se dispara el rebalanceo cuando se agota la precisión

- **WHEN** la diferencia entre los `position` de dos hermanos vecinos es menor a `0.0001`
- **THEN** una función rebalancea en una sola transacción los `position` de todos los hermanos de ese padre

### Requirement: Validación de propietario al mover una tarea

Un trigger SHALL validar, al mover una tarea (cambiar su `project_id` o
`section_id`), que el proyecto y la sección destino pertenezcan al mismo `user_id`
que la tarea. Esta validación es consecuencia directa de que `user_id` es
redundante en cada tabla (no se navega la propiedad vía joins): sin el trigger, esa
redundancia permite escribir filas incoherentes que RLS por sí solo no detecta,
porque RLS solo verifica que el `user_id` de la fila coincida con el usuario
autenticado, no que `project_id` y `section_id` le pertenezcan también a él.

#### Scenario: Se rechaza mover una tarea a un proyecto ajeno

- **WHEN** se intenta actualizar `project_id` de una tarea para apuntar a un proyecto que pertenece a otro usuario
- **THEN** el trigger rechaza la operación

#### Scenario: Se rechaza mover una tarea a una sección ajena

- **WHEN** se intenta actualizar `section_id` de una tarea para apuntar a una sección que pertenece a otro usuario
- **THEN** el trigger rechaza la operación

#### Scenario: Mover una tarea entre proyecto y sección propios funciona

- **WHEN** se actualiza `project_id` y `section_id` de una tarea hacia un proyecto y una sección que pertenecen al mismo usuario dueño de la tarea
- **THEN** la operación se completa sin error

### Requirement: Replicación de Realtime en las tablas de fase 1

El esquema SHALL habilitar la replicación de Realtime sobre `tasks`, `projects`, `sections`, `labels`, `task_labels`, `comments`, `reminders`, `filters`, `habits` y `habit_completions`. `calendar_connections` MUST NOT sumarse a esta publicación: `sincronizacion-tiempo-real` fija que no se replica.

#### Scenario: Las tablas de fase 1 están en la publicación de Realtime

- **WHEN** se inspecciona la publicación de Realtime tras aplicar las migraciones de esta fase
- **THEN** `tasks`, `projects`, `sections`, `labels`, `task_labels`, `comments`, `reminders`, `filters`, `habits` y `habit_completions` están incluidas en la publicación
- **AND** `calendar_connections` no está incluida

### Requirement: Migraciones de solo ida

Una migración ya aplicada MUST NOT editarse. Un error en una migración aplicada
SHALL corregirse creando una migración nueva.

#### Scenario: Corregir un error requiere una migración nueva

- **WHEN** se detecta un error en una migración que ya fue aplicada al proyecto remoto o al entorno local
- **THEN** la corrección se implementa como un archivo de migración nuevo
- **AND** el archivo de la migración original no se modifica

### Requirement: Regeneración de tipos después de cada migración

Después de aplicar cada migración, SHALL ejecutarse `pnpm db:types` para
regenerar los tipos de TypeScript a partir del esquema resultante.

#### Scenario: Los tipos se regeneran tras aplicar una migración

- **WHEN** se aplica una migración nueva al esquema
- **THEN** se ejecuta `pnpm db:types` inmediatamente después
- **AND** los tipos de TypeScript generados reflejan las tablas y columnas de la migración recién aplicada

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

### Requirement: Migración de habits

La migración que crea `habits` SHALL declarar `id` como clave primaria, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `name text`, `icon text`, `color text` restringido mediante check constraint al mismo criterio que `projects.color` y `labels.color` (la paleta fija de diez colores o un hex personalizado de seis dígitos), con la validación de contraste AA contra los dos temas de la decisión D29 resuelta en la capa de validación y no en la base, `duration_minutes integer`, `scheduled_time time` nullable (sin valor significa "todo el día"), `frequency_type text` restringido a `daily`, `times_per_week` o `specific_days`, `times_per_week smallint` nullable, `days_of_week smallint[]` nullable, `is_archived boolean` y `created_at timestamptz`. La misma migración SHALL habilitar RLS, declarar sus cuatro políticas con `(select auth.uid()) = user_id`, y crear un índice en `user_id`. Un check constraint SHALL exigir que `times_per_week` esté entre 1 y 7 y sea `NOT NULL` únicamente cuando `frequency_type = 'times_per_week'`, y que `days_of_week` no esté vacío y sea `NOT NULL` únicamente cuando `frequency_type = 'specific_days'`, codificando los días de la semana como ISO-8601 (1 = lunes … 7 = domingo).

#### Scenario: habits nace con su RLS, su check de color y su índice

- **WHEN** se inspecciona la migración que crea `habits`
- **THEN** `user_id` es `uuid`, `NOT NULL`, con foreign key hacia `auth.users(id)` y `ON DELETE CASCADE`
- **AND** existe un check constraint que restringe `color` al mismo criterio que `projects.color` y `labels.color`: la paleta fija de diez colores o un hex personalizado de seis dígitos
- **AND** la misma migración habilita RLS, declara las cuatro políticas con `(select auth.uid()) = user_id`, y crea un índice en `user_id`

#### Scenario: times_per_week solo es obligatorio y válido para ese tipo de frecuencia

- **WHEN** se intenta insertar un hábito con `frequency_type = 'times_per_week'` y `times_per_week` nulo, o con un valor fuera del rango de 1 a 7
- **THEN** la base de datos rechaza la operación por violación de check constraint
- **WHEN** se intenta insertar un hábito con `frequency_type` distinto de `'times_per_week'` y `times_per_week` con un valor no nulo
- **THEN** la base de datos rechaza la operación por violación de check constraint

#### Scenario: days_of_week solo es obligatorio y no vacío para días específicos

- **WHEN** se intenta insertar un hábito con `frequency_type = 'specific_days'` y `days_of_week` nulo o vacío
- **THEN** la base de datos rechaza la operación por violación de check constraint
- **WHEN** se intenta insertar un hábito con `frequency_type` distinto de `'specific_days'` y `days_of_week` con un valor no nulo
- **THEN** la base de datos rechaza la operación por violación de check constraint

### Requirement: Migración de habit_completions

La migración que crea `habit_completions` SHALL declarar `id` como clave primaria, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE` y `completed_on date NOT NULL`, con un constraint de unicidad sobre `(habit_id, completed_on)`. `habit_completions` SHALL llevar su propia columna `user_id`, no derivada por join contra `habits`, para que la política de RLS sea una sola comparación directa según la decisión D11. La misma migración SHALL habilitar RLS, declarar sus cuatro políticas con `(select auth.uid()) = user_id`, y crear el índice `(habit_id, completed_on desc)` que abarata el cálculo de racha.

#### Scenario: habit_completions nace con su unicidad, su RLS y su índice de racha

- **WHEN** se inspecciona la migración que crea `habit_completions`
- **THEN** `habit_id` tiene foreign key hacia `habits` con `ON DELETE CASCADE`
- **AND** existe un constraint de unicidad sobre `(habit_id, completed_on)`
- **AND** la tabla tiene su propia columna `user_id`
- **AND** la misma migración habilita RLS, declara las cuatro políticas con `(select auth.uid()) = user_id`, y crea un índice sobre `(habit_id, completed_on desc)`

#### Scenario: No se puede marcar el mismo hábito dos veces el mismo día

- **WHEN** se intenta insertar dos filas en `habit_completions` con el mismo `habit_id` y el mismo `completed_on`
- **THEN** la base de datos rechaza la segunda inserción por violación del constraint de unicidad

#### Scenario: Borrar un hábito borra sus marcas

- **WHEN** se elimina una fila de `habits`
- **THEN** se eliminan en cascada todas las filas de `habit_completions` que apuntaban a ese hábito

### Requirement: Migración de habit_schedule_overrides

La migración que crea `habit_schedule_overrides` SHALL declarar una clave primaria compuesta `(habit_id, date)`, con `habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE`, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `date date NOT NULL` y `scheduled_time time NOT NULL`. `habit_schedule_overrides` SHALL llevar su propia columna `user_id`, no derivada por join contra `habits`, según la decisión D11. La misma migración SHALL habilitar RLS y declarar sus cuatro políticas con `(select auth.uid()) = user_id`.

#### Scenario: habit_schedule_overrides nace con su clave compuesta, su cascada y su RLS

- **WHEN** se inspecciona la migración que crea `habit_schedule_overrides`
- **THEN** la clave primaria es la combinación de `habit_id` y `date`
- **AND** `habit_id` tiene foreign key hacia `habits` con `ON DELETE CASCADE`
- **AND** la tabla tiene su propia columna `user_id`
- **AND** la misma migración habilita RLS y declara las cuatro políticas con `(select auth.uid()) = user_id`

#### Scenario: Borrar un hábito borra sus reprogramaciones puntuales

- **WHEN** se elimina una fila de `habits`
- **THEN** se eliminan en cascada todas las filas de `habit_schedule_overrides` que apuntaban a ese hábito

### Requirement: Función de cálculo de racha, SECURITY INVOKER

Una función de base de datos `SECURITY INVOKER` SHALL calcular y devolver la racha actual y la mejor racha de un hábito a partir de sus filas en `habit_completions`, sin que ninguna de las dos se guarde como columna. La función SHALL apoyarse en el índice `(habit_id, completed_on desc)` para mantener el cálculo barato, y SHALL respetar la row level security de quien la invoca, según la decisión D10.

#### Scenario: La función devuelve racha actual y mejor racha sin columnas denormalizadas

- **WHEN** se llama la función de racha para un hábito con historial en `habit_completions`
- **THEN** devuelve la racha actual y la mejor racha calculadas a partir de las filas existentes
- **AND** ninguna tabla del esquema guarda esos dos valores como columna

#### Scenario: La función respeta RLS al ser SECURITY INVOKER

- **WHEN** se inspecciona la definición de la función de racha
- **THEN** está declarada `SECURITY INVOKER`
- **AND** un usuario que la invoca solo puede calcular la racha de hábitos que le pertenecen

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

### Requirement: Migración de habit_reminders

La migración SHALL crear `habit_reminders` con `id`, `user_id`, `habit_id` y
`offset_minutes`, con RLS habilitado y las cuatro políticas acotadas a
`auth.uid() = user_id` en la misma migración que crea la tabla. `habit_id` SHALL
referenciar `habits` con `on delete cascade`, y `user_id` SHALL ser una columna propia
con FK en cascada a `auth.users`, no derivada por join (D11).

`offset_minutes` SHALL ser cero o negativo: un recordatorio de hábito NUNCA SHALL
programarse después de la hora del hábito.

SHALL existir un `unique (habit_id, offset_minutes)`: el mismo desfase no se repite en
el mismo hábito. SHALL existir un índice sobre `user_id` para que la política de RLS no
escanee la tabla entera.

La tabla SHALL entrar en la publicación de Realtime, para que editar los recordatorios
de un hábito se refleje en las demás pestañas.

#### Scenario: RLS impide leer los recordatorios de otra cuenta

- **WHEN** una cuenta consulta `habit_reminders` sin filtrar por `user_id`
- **THEN** solo obtiene las filas cuyo `user_id` es el suyo

#### Scenario: El mismo desfase no se repite

- **WHEN** se intenta insertar un segundo `habit_reminders` con el mismo `habit_id` y el
  mismo `offset_minutes`
- **THEN** la inserción SHALL fallar por la restricción de unicidad

#### Scenario: Un desfase positivo se rechaza

- **WHEN** se intenta insertar un `habit_reminders` con `offset_minutes = 30`
- **THEN** la inserción SHALL fallar

#### Scenario: Borrar el hábito borra sus recordatorios

- **WHEN** se borra una fila de `habits` que tiene recordatorios
- **THEN** sus filas de `habit_reminders` se borran en cascada

### Requirement: Migración de habit_reminder_deliveries

La migración SHALL crear `habit_reminder_deliveries` con `habit_id`, `user_id`, `date`,
`offset_minutes` y `delivered_at`, con clave primaria compuesta
`(habit_id, date, offset_minutes)` — la clave es el mecanismo de entrega única, no un
detalle de indexación. `date` SHALL ser la fecha **local** del usuario, no UTC.

SHALL tener RLS habilitado con las cuatro políticas en la misma migración que la crea, y
un índice sobre `user_id`. NUNCA SHALL entrar en la publicación de Realtime: ninguna
interfaz se suscribe a ella, mismo criterio que `habit_schedule_overrides` y
`habit_skips`.

#### Scenario: La clave primaria impide la entrega duplicada

- **WHEN** se intenta insertar dos veces la misma combinación de `habit_id`, `date` y
  `offset_minutes`
- **THEN** la segunda inserción SHALL ser rechazada por la clave primaria

#### Scenario: Borrar el hábito borra su historial de entregas

- **WHEN** se borra una fila de `habits` con entregas registradas
- **THEN** sus filas de `habit_reminder_deliveries` se borran en cascada

### Requirement: Función de reclamo de recordatorios de hábito, SECURITY DEFINER

SHALL existir `claim_due_habit_reminders(p_limit integer)`, `security definer` con
`search_path = public`, que en **una sola sentencia** inserte en
`habit_reminder_deliveries` las ocurrencias vencidas y devuelva únicamente las filas que
efectivamente insertó (`insert … on conflict do nothing returning`). `security definer`
es necesario porque el cron no tiene un usuario autenticado detrás.

La función SHALL resolver la hora efectiva de cada hábito por `coalesce` entre la
reprogramación del día, la hora habitual y la hora de referencia del usuario; SHALL
calcular el instante en la zona horaria del usuario; SHALL descartar hábitos archivados,
días anteriores a la creación, días que la frecuencia no cubre, días ya marcados en
`habit_completions` y días salteados en `habit_skips`; y SHALL acotar el intervalo a los
últimos 15 minutos.

El permiso de ejecución SHALL revocarse de `public` y otorgarse solo a `service_role`.

En la misma corrida SHALL purgar las filas de `habit_reminder_deliveries` anteriores a 7
días.

#### Scenario: Solo devuelve lo que insertó

- **WHEN** dos llamadas concurrentes a `claim_due_habit_reminders` compiten por la misma
  ocurrencia
- **THEN** una devuelve la fila y la otra devuelve cero filas

#### Scenario: No es ejecutable por una cuenta autenticada

- **WHEN** una cuenta autenticada intenta ejecutar `claim_due_habit_reminders`
- **THEN** la ejecución SHALL ser denegada por falta de permiso

### Requirement: Marca de contenido de ejemplo en user_preferences

`user_preferences` SHALL tener una columna `seeded_at timestamptz` nullable que marca
que la cuenta ya recibió su contenido de ejemplo.

La migración que agrega la columna SHALL escribir, **en el mismo archivo**, `seeded_at`
con un valor no nulo para todas las filas existentes. Una cuenta anterior a esta
migración NUNCA SHALL quedar con `seeded_at` nulo: eso le sembraría contenido de ejemplo
encima de sus datos reales en su próxima entrada.

El trigger de aprovisionamiento de cuenta NUNCA SHALL crear contenido de ejemplo: sigue
creando únicamente perfil, preferencias y Bandeja de entrada.

#### Scenario: Las cuentas existentes quedan marcadas por la propia migración

- **WHEN** se aplica la migración que agrega `seeded_at` sobre una base con cuentas
  existentes
- **THEN** todas esas filas SHALL quedar con `seeded_at` no nulo

#### Scenario: Una cuenta nueva arranca sin marca

- **WHEN** se crea una cuenta nueva
- **THEN** su fila de `user_preferences` SHALL tener `seeded_at` nulo
- **AND** el trigger de aprovisionamiento NUNCA SHALL haber creado ningún proyecto de
  ejemplo

