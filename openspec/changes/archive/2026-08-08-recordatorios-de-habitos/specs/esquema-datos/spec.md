## ADDED Requirements

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
