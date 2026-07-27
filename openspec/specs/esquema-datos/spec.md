# esquema-datos Specification

## Purpose
TBD - created by archiving change fase-1-base-usable. Update Purpose after archive.
## Requirements
### Requirement: Solo las siete tablas de fase 1

El esquema SHALL crear exactamente siete tablas en esta fase: `profiles`,
`user_preferences`, `projects`, `sections`, `tasks`, `labels` y `task_labels`. Las
demás tablas descritas en `docs/data-model.md` (`comments`, `reminders`,
`push_subscriptions`, `filters`, `habits`, `habit_completions`,
`habit_schedule_overrides`, `calendar_connections`) pertenecen a fases posteriores
y MUST NOT crearse vacías por adelantado en esta fase.

#### Scenario: El esquema remoto contiene solo las tablas de fase 1

- **WHEN** se listan las tablas del esquema `public` tras aplicar todas las migraciones de esta fase
- **THEN** existen `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels` y `task_labels`
- **AND** no existe ninguna de las tablas de fases posteriores (`comments`, `reminders`, `push_subscriptions`, `filters`, `habits`, `habit_completions`, `habit_schedule_overrides`, `calendar_connections`)

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
`user_id` en cada una de las siete tablas, `(user_id, due_date)`,
`(user_id, due_at)`, `(user_id, project_id, position)`, `(user_id, completed_at)` y
`(parent_id)` sobre `tasks`. El índice GIN de búsqueda en español no SHALL crearse
en esta fase.

#### Scenario: Los índices de tasks existen

- **WHEN** se listan los índices de la tabla `tasks` tras aplicar las migraciones
- **THEN** existen índices sobre `(user_id, due_date)`, `(user_id, due_at)`, `(user_id, project_id, position)`, `(user_id, completed_at)` y `(parent_id)`
- **AND** no existe ningún índice GIN sobre `to_tsvector('spanish', title)`

#### Scenario: Cada tabla tiene índice en user_id

- **WHEN** se listan los índices de `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels` y `task_labels`
- **THEN** cada tabla tiene al menos un índice que cubre `user_id`

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
`user_preferences.default_view` SHALL aceptar únicamente `'bandeja'` (default) o
`'hoy'` en esta fase. `user_preferences.timezone` SHALL tener default
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

El esquema SHALL habilitar la replicación de Realtime sobre `tasks`, `projects`,
`sections`, `labels` y `task_labels`.

#### Scenario: Las tablas de fase 1 están en la publicación de Realtime

- **WHEN** se inspecciona la publicación de Realtime tras aplicar las migraciones de esta fase
- **THEN** `tasks`, `projects`, `sections`, `labels` y `task_labels` están incluidas en la publicación

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

