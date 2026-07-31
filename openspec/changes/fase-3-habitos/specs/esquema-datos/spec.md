## MODIFIED Requirements

### Requirement: Solo las siete tablas de fase 1

El esquema SHALL haber creado exactamente siete tablas en la fase 1: `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels` y `task_labels`. La fase 2 agregó cinco tablas más: `comments`, `reminders`, `push_subscriptions`, `filters` y `view_preferences`, para un total de doce. Esta fase agrega tres tablas más: `habits`, `habit_completions` y `habit_schedule_overrides`, para un total de quince. La tabla restante descrita en `docs/data-model.md` (`calendar_connections`) pertenece a la fase 4 y MUST NOT crearse vacía por adelantado.

#### Scenario: El esquema remoto contiene las tablas de fase 1, 2 y 3

- **WHEN** se listan las tablas del esquema `public` tras aplicar todas las migraciones de esta fase
- **THEN** existen `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels`, `task_labels`, `comments`, `reminders`, `push_subscriptions`, `filters`, `view_preferences`, `habits`, `habit_completions` y `habit_schedule_overrides`
- **AND** no existe `calendar_connections`

### Requirement: Replicación de Realtime en las tablas de fase 1

El esquema SHALL habilitar la replicación de Realtime sobre `tasks`, `projects`, `sections`, `labels`, `task_labels`, `comments`, `reminders`, `filters`, `habits` y `habit_completions`.

#### Scenario: Las tablas de fase 1 están en la publicación de Realtime

- **WHEN** se inspecciona la publicación de Realtime tras aplicar las migraciones de esta fase
- **THEN** `tasks`, `projects`, `sections`, `labels`, `task_labels`, `comments`, `reminders`, `filters`, `habits` y `habit_completions` están incluidas en la publicación

## ADDED Requirements

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
