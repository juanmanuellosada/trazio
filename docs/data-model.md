# Trazio — Modelo de datos

Postgres sobre Supabase. Toda tabla con datos de usuario lleva `user_id` y RLS.

Este documento define **qué** guardamos y **por qué**. El SQL exacto vive en
`supabase/migrations/`.

---

## Principios

1. **`user_id` en todas las tablas.** No se navega la propiedad a través de joins
   (por ejemplo, "esta tarea es mía porque su proyecto es mío"). Cada fila declara
   su dueño. Es redundante y es a propósito: hace las políticas de RLS simples y
   rápidas.
2. **RLS en la misma migración que crea la tabla.** Sin excepciones.
3. **UTC para instantes, `date` para días.** Un vencimiento con hora es
   `timestamptz`. Un vencimiento sin hora es `date`. No mezclar.
4. **Borrado físico, no lógico.** No hay papelera. El deshacer se resuelve en el
   cliente reinsertando, no con `deleted_at`.

---

## Tablas

### `profiles`

Extiende `auth.users`. Se crea por trigger al registrarse.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | Igual a `auth.users.id` |
| `full_name` | `text` | |
| `avatar_url` | `text` | |
| `created_at` | `timestamptz` | |

### `user_preferences`

Una fila por usuario, creada junto con el perfil.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `user_id` | `uuid` PK FK | |
| `timezone` | `text` | IANA, por ejemplo `America/Argentina/Buenos_Aires` |
| `theme` | `text` | `light` \| `dark` \| `system` |
| `date_format` | `text` | |
| `time_format` | `smallint` | `12` o `24` |
| `week_starts_on` | `smallint` | 0 domingo, 1 lunes, 6 sábado |
| `default_view` | `text` | Pantalla al entrar |
| `default_project_id` | `uuid` FK | Destino del alta rápida |
| `reference_time` | `time` | Hora de referencia para recordatorios relativos: a qué hora se considera que vence una tarea con día pero sin hora |
| `seeded_at` | `timestamptz` nullable | No nulo si la cuenta ya recibió su contenido de ejemplo (`onboarding-con-ejemplos`). Cuentas anteriores a esta función quedan marcadas por backfill en la misma migración que agregó la columna. |

### `projects`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `parent_id` | `uuid` FK nullable | Auto-referencia. Máximo 3 niveles. |
| `name` | `text` | |
| `color` | `text` nullable | Id de la paleta fija; nulo solo en la Bandeja de entrada (D27) |
| `icon` | `text` | Emoji; nulo en la Bandeja de entrada |
| `description` | `text` | |
| `preferred_view` | `text` | `list` \| `board` |
| `is_inbox` | `boolean` | Único `true` por usuario |
| `is_favorite` | `boolean` | |
| `is_archived` | `boolean` | |
| `is_example` | `boolean` | `true` en el proyecto sembrado por `onboarding-con-ejemplos`. Único `true` por usuario. |
| `position` | `numeric` | Orden manual |

**Reglas de integridad:**

- Índice único parcial: un solo proyecto con `is_inbox = true` por usuario.
- Índice único parcial: un solo proyecto con `is_example = true` por usuario.
- Trigger que impide borrar o archivar el proyecto de Bandeja de entrada.
- Constraint o trigger que impide anidar más de tres niveles.
- Constraint que impide que un proyecto sea su propio ancestro.
- Constraint que exige `color` en todo proyecto que no sea la Bandeja, y lo
  prohíbe en la Bandeja (D27).

**Sobre `position`:** usar `numeric` y no `integer` permite insertar entre dos
elementos calculando el promedio, sin reescribir toda la lista en cada arrastre.

### `sections`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `project_id` | `uuid` FK | `ON DELETE CASCADE` |
| `name` | `text` | |
| `description` | `text` | Opcional, sin default, igual patrón que `projects.description`. |
| `position` | `numeric` | |
| `is_collapsed` | `boolean` | |

Al eliminar una sección, sus tareas quedan con `section_id = NULL` (no se borran).
Esto es `ON DELETE SET NULL` desde `tasks.section_id`.

### `tasks`

La tabla central.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `project_id` | `uuid` FK | `ON DELETE CASCADE` |
| `section_id` | `uuid` FK nullable | `ON DELETE SET NULL` |
| `parent_id` | `uuid` FK nullable | Subtareas, sin límite de niveles |
| `title` | `text` | **Texto plano** |
| `description` | `jsonb` nullable | Documento de Tiptap |
| `priority` | `smallint` | 1 Urgente … 4 Baja |
| `due_date` | `date` nullable | Vencimiento sin hora |
| `due_at` | `timestamptz` nullable | Vencimiento con hora |
| `duration_minutes` | `integer` nullable | |
| `deadline` | `date` nullable | Fecha tope |
| `completed_at` | `timestamptz` nullable | `NULL` = pendiente |
| `recurrence_rule` | `text` nullable | RRULE |
| `recurrence_ends_at` | `timestamptz` nullable | |
| `recurrence_count` | `integer` nullable | |
| `position` | `numeric` | |
| `created_at` / `updated_at` | `timestamptz` | |

**Sobre `due_date` y `due_at`:** son excluyentes. Una tarea tiene una u otra, nunca
las dos. Constraint que lo garantice. La alternativa —un solo `timestamptz` con un
booleano `has_time`— es más compacta pero produce corrimientos de día al cambiar de
zona horaria; esta forma los evita.

**Índices necesarios:** `(user_id, due_date)`, `(user_id, due_at)`,
`(user_id, project_id, position)`, `(user_id, completed_at)`, `(parent_id)`.

Para el buscador: índice GIN sobre `to_tsvector('spanish', title)`. Usar la
configuración `spanish` y no `simple` — maneja los acentos y la derivación
correctamente.

### `labels`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `name` | `text` | Único por usuario |
| `color` | `text` | |
| `is_favorite` | `boolean` | |

### `task_labels`

Tabla puente. PK compuesta `(task_id, label_id)`. Lleva `user_id` para la política
de RLS. Ambos FK con `ON DELETE CASCADE`.

### `comments`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `task_id` | `uuid` FK | `ON DELETE CASCADE` |
| `content` | `jsonb` | Documento de Tiptap |
| `created_at` / `updated_at` | `timestamptz` | Si difieren, se muestra "editado" |

### `reminders`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `task_id` | `uuid` FK | `ON DELETE CASCADE` |
| `remind_at` | `timestamptz` | Momento absoluto ya calculado |
| `offset_minutes` | `integer` nullable | Si es relativo, cuántos minutos antes |
| `delivered_at` | `timestamptz` nullable | Se entrega una sola vez |

**Índice clave:** parcial sobre `remind_at` donde `delivered_at IS NULL`. Es el que
usa el cron cada minuto; sin él, la consulta escanea toda la tabla.

Cuando se cambia la fecha u hora de una tarea, sus recordatorios relativos se
recalculan. Si la tarea tiene solo día (sin hora), el recálculo usa la hora de
referencia de `user_preferences` combinada con la zona horaria del usuario.
Quitarle la hora a una tarea que conserva su día recalcula; solo quedarse sin
ninguna fecha elimina los relativos pendientes.

### `push_subscriptions`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `endpoint` | `text` | Único |
| `p256dh` / `auth` | `text` | Claves de la suscripción |
| `created_at` | `timestamptz` | |

Varias por usuario: una por dispositivo. Si el envío devuelve 404 o 410, borrar la
suscripción.

### `filters`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `name` | `text` | |
| `query` | `text` | La consulta en crudo |
| `color` / `icon` | `text` | |
| `is_favorite` | `boolean` | |
| `is_example` | `boolean` | `true` en el filtro sembrado por `onboarding-con-ejemplos`. Único `true` por usuario (índice único parcial). |

Se guarda la consulta como texto, no parseada. El parser corre en tiempo de
ejecución, así se puede mejorar sin migrar datos.

### `habits`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `name` | `text` | |
| `icon` / `color` | `text` | |
| `duration_minutes` | `integer` | |
| `scheduled_time` | `time` nullable | Sin valor = todo el día |
| `frequency_type` | `text` | `daily` \| `times_per_week` \| `specific_days` |
| `times_per_week` | `smallint` nullable | |
| `days_of_week` | `smallint[]` nullable | |
| `is_archived` | `boolean` | |
| `is_example` | `boolean` | `true` en el hábito sembrado por `onboarding-con-ejemplos`. Único `true` por usuario (índice único parcial). |
| `created_at` | `timestamptz` | El hábito no existe antes de esta fecha |

### `habit_completions`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `habit_id` | `uuid` FK | `ON DELETE CASCADE` |
| `completed_on` | `date` | Único junto con `habit_id` |

Las rachas **se calculan**, no se guardan. Guardar un contador denormalizado obliga
a mantenerlo sincronizado y se desfasa apenas hay un borrado. Con un índice sobre
`(habit_id, completed_on desc)` el cálculo es barato.

### `habit_schedule_overrides`

Reprogramación de un hábito para un día puntual sin tocar su horario habitual.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `habit_id` | `uuid` FK | |
| `user_id` | `uuid` FK | |
| `date` | `date` | PK compuesta con `habit_id` |
| `scheduled_time` | `time` | |

### `habit_reminders`

Reglas de recordatorio de un hábito (`recordatorios-de-habitos`): siempre
relativas a su hora, nunca puntuales.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `habit_id` | `uuid` FK | `ON DELETE CASCADE` |
| `offset_minutes` | `integer` | Cero o negativo; único junto con `habit_id` |

### `habit_reminder_deliveries`

El mecanismo de entrega única de un recordatorio de hábito. A diferencia de
`reminders` (que marca `delivered_at` sobre una fila que ya existía), acá la fila
**se crea al reclamar**: no hay ocurrencias futuras materializadas (D-A de
`recordatorios-de-habitos`), así que la clave primaria compuesta es lo que impide
el duplicado, no un `update`.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `habit_id` | `uuid` FK | PK compuesta con `date` y `offset_minutes` |
| `user_id` | `uuid` FK | |
| `date` | `date` | Fecha **local** del usuario, no UTC |
| `offset_minutes` | `integer` | |
| `delivered_at` | `timestamptz` | |

`claim_due_habit_reminders(p_limit)` es el equivalente de `claim_due_reminders`
para hábitos: cada minuto evalúa, contra el estado actual de `habits`,
`habit_schedule_overrides`, `habit_skips` y `habit_completions`, qué ocurrencias
están vencidas dentro de una ventana de gracia de 15 minutos **con cota
inferior** — a diferencia de `claim_due_reminders`, que no la tiene, porque acá
sin esa cota la primera corrida después de desplegar encontraría vencidas todas
las ocurrencias pasadas de todos los hábitos. Purga en la misma corrida las
entregas de más de 7 días. No entra en la publicación de Realtime.

### `calendar_connections` *(fase 4)*

| Columna | Tipo | Notas |
| --- | --- | --- |
| `user_id` | `uuid` PK FK | |
| `provider` | `text` | Siempre `google` por ahora |
| `refresh_token` | `text` | **Cifrado.** Nunca sale del servidor. |
| `enabled_calendar_ids` | `text[]` | |
| `status` | `text` | `active` \| `needs_reauth` |

Los eventos de calendario **no se guardan**: se leen de la API de Google en cada
consulta, con caché en memoria de corta duración.

---

## Política de RLS estándar

Para cada tabla con `user_id`:

```sql
alter table public.{tabla} enable row level security;

create policy "{tabla}_select_own" on public.{tabla}
  for select using ((select auth.uid()) = user_id);

create policy "{tabla}_insert_own" on public.{tabla}
  for insert with check ((select auth.uid()) = user_id);

create policy "{tabla}_update_own" on public.{tabla}
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "{tabla}_delete_own" on public.{tabla}
  for delete using ((select auth.uid()) = user_id);
```

El subselect en `auth.uid()` no es cosmético: permite que Postgres evalúe la función
una vez por consulta en lugar de una vez por fila.

---

## Realtime

Habilitar replicación en: `tasks`, `projects`, `sections`, `labels`, `task_labels`,
`comments`, `reminders`, `filters`, `habits`, `habit_completions`, `habit_reminders`.
`habit_reminder_deliveries` queda afuera a propósito, como `habit_schedule_overrides`
y `habit_skips`: ninguna interfaz se suscribe a esas tablas.

Cada cliente se suscribe filtrando por su `user_id`. Al recibir un evento, invalidar
la query de TanStack Query correspondiente en lugar de mutar el caché a mano: es más
lento en microsegundos y muchísimo más difícil de romper.

Las nueve tablas que un cliente suscribe con ese filtro (todas menos `labels` y
`task_labels`, ver `lib/realtime/subscribe.ts`) necesitan además
`replica identity full`: con el `default` de Postgres, un DELETE solo manda la
primary key al WAL, y como esa fila no trae `user_id`, Realtime no puede evaluar
el filtro y descarta el evento en silencio (D37). Si se agrega una suscripción
nueva por `user_id` a `labels` o `task_labels`, hay que sumarlas a la lista de
`replica identity full` en la misma migración.
