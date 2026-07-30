## Context

La fase 1 dejó un producto que guarda tareas correctamente: siete tablas, RLS en
todas, un patrón de datos consistente (Server Component lee con `get-*.ts` y pasa
`initialData` a un hook de TanStack Query con la misma `queryKey`; las mutaciones
viven en `lib/<dominio>/mutations.ts` con optimistic updates; realtime invalida esas
mismas keys) y un parser de lenguaje natural maduro.

La fase 2 no cambia ese patrón: lo extiende. Pero introduce cuatro cosas que el
proyecto no tenía y que hay que decidir antes de escribir código:

1. Un **segundo lenguaje** además del parser de alta rápida — el de consulta — que
   se evalúa contra la base y no contra el cliente.
2. **Infraestructura de servidor** propia por primera vez: `supabase/functions/`,
   `pg_cron`, claves VAPID.
3. **Estado que sobrevive a la navegación**: la pila de deshacer y la memoria de
   opciones por pantalla, con D12 vigente (sin librería de estado global).
4. **Interpretación** del RRULE que hoy solo se escribe.

Restricciones heredadas que condicionan el diseño: D1 (sin offline, el service
worker existe solo para push), D5 (el rojo de marca no se usa para errores), D9
(`due_date` y `due_at` excluyentes), D12 (sin Zustand/Redux), D24 (ninguna acción
disponible solo por arrastre), D25 (Hoy ordena por hora, Completado por fecha de
completado), D28 (el detalle es modal centrado).

## Goals / Non-Goals

**Goals:**

- Un lenguaje de consulta con errores en español que señalen la posición exacta, y
  que se evalúe en Postgres para que la vista previa y los resultados coincidan.
- Búsqueda insensible a acentos sin romper "la búsqueda es literal": stemming y
  `unaccent`, nunca corrección de tipeos ni coincidencia difusa.
- Entrega de recordatorios **exactamente una vez**, garantizada por la base y no
  por la aplicación.
- Un solo listener de teclado en toda la aplicación, con las colisiones del spec
  (`S`, `E`, `T`) resueltas por contexto y no por casualidad.
- Doce funcionalidades implementables en tandas independientes, porque se delegan a
  subagentes en paralelo sobre el mismo árbol de trabajo.

**Non-Goals:**

- El modo calendario de la barra de opciones y de Próximos: es fase 4. La barra
  ofrece "lista" y "panel"; el tercer valor queda sin implementar.
- Los hábitos que Próximos y el badge deberían mostrar junto a las tareas: son
  fase 3. Se deja el punto de extensión, no la funcionalidad.
- Deshacer persistente entre sesiones o entre dispositivos.
- Un editor visual de RRULE tipo Google Calendar. La recurrencia se escribe en
  lenguaje natural y se edita con controles simples.

## Decisions

### D-A. El lenguaje de consulta se parsea en el cliente y se evalúa en Postgres

Descenso recursivo escrito a mano en `lib/query-language/`, sin dependencia. El
parser produce un AST, o un error con `posicion`, `longitud` y mensaje en español.

Precedencia, que el spec no define: `!` > `&` > `|`. Es la convención de todos los
lenguajes booleanos y la que el ejemplo del spec —
`(priority:1,2 & due:next7days) & !label:espera` — deja implícita. Los paréntesis
agrupan, y `!` puede negar tanto un token como un grupo.

Los nombres con espacios van entre comillas dobles: `label:"en espera"`. Sin
comillas, el nombre termina en el primer espacio, coma o paréntesis. Los nombres de
etiqueta y proyecto se comparan sin distinguir mayúsculas ni acentos, igual que ya
hace `lib/parser/` para el alta rápida.

**El AST se manda como `jsonb` a una función `buscar_tareas(ast jsonb)` en Postgres,
`SECURITY INVOKER`**, que lo compila a predicados SQL y devuelve `setof tasks`.

*Alternativa descartada:* componer los filtros con el query builder de PostgREST.
Se rompe en el caso que el propio criterio de aceptación exige: `!label:espera` es
una condición de no-existencia sobre `task_labels`, y PostgREST no la compone dentro
de un `or` con otras condiciones. Compilar a SQL lo resuelve de una.

*Alternativa descartada:* mandar el texto crudo y parsear en Postgres. Perdería los
errores en vivo mientras se escribe, que es la mitad del requisito.

`SECURITY INVOKER` no es un detalle: mantiene la RLS activa dentro de la función, así
que el aislamiento por usuario sigue siendo el mismo de siempre. El AST se valida
contra un esquema Zod antes de mandarlo, y la función compila desde una lista blanca
de campos y operadores — nunca concatena texto del usuario en el SQL.

### D-B. La búsqueda usa una configuración `spanish_unaccent` propia

`unaccent()` no es `IMMUTABLE`, así que no puede usarse dentro de una columna
generada. La salida es crear una configuración de búsqueda propia:

```sql
create extension if not exists unaccent;
create text search configuration spanish_unaccent (copy = spanish);
alter text search configuration spanish_unaccent
  alter mapping for hword, hword_part, word with unaccent, spanish_stem;
```

Con eso, `to_tsvector('spanish_unaccent', …)` sí es inmutable y sirve para una
columna generada con índice GIN. "reunion" encuentra "reunión" por el `unaccent`, y
"reuniones" encuentra "reunión" por el `spanish_stem`. Ninguna de las dos cosas es
corrección de tipeos: "renuion" no encuentra nada, como pide el spec.

La descripción es `jsonb` de Tiptap y no se puede indexar directamente. Se agrega
`tasks.description_text text`, que la aplicación escribe en el mismo update que la
descripción, y `tasks.search_vector` como columna generada sobre
`title || ' ' || coalesce(description_text, '')`.

*Alternativa descartada:* extraer el texto del `jsonb` con una función recursiva en
Postgres. Funciona, pero mete la forma del documento de Tiptap adentro de una
migración: cualquier extensión nueva del editor obliga a migrar la base.

El índice GIN sobre `search_vector` (`tasks_search_vector_idx`) existe y está bien
construido, pero bajo RLS el planner no lo elige. `ts_match_vq`, la función detrás
de `@@`, no está marcada `LEAKPROOF` en el catálogo de Postgres, y para un rol
no-superusuario con RLS activa Postgres no empuja un operador no-leakproof como
condición de índice antes de aplicar la política de fila — hacerlo evaluaría el
operador sobre filas que el usuario no puede ver. El acceso real, medido con
`EXPLAIN (ANALYZE, BUFFERS)` contra 580.000 filas con RLS activa como
`authenticated`, es el btree `tasks_user_id_due_at_idx`: acota primero por
`user_id`, y el `tsquery` se aplica después como `Filter` fila por fila — 18ms
con 80.000 tareas propias, contra 0,2ms sin RLS (mismo índice GIN, ahí sí usado).
Se acepta: el fallback por `user_id` ya acota el conjunto, y un usuario real de
tareas personales tiene cientos o pocos miles de tareas, no ochenta mil. Detalle
y alternativas descartadas en D36 de `docs/decisions.md`.

### D-C. Los recordatorios se reclaman antes de enviarse

`pg_cron` corre cada minuto e invoca la edge function con `pg_net`. La función no
lee y después marca: **reclama y después envía**, en una sola sentencia atómica.

```sql
update reminders set delivered_at = now()
where id in (
  select id from reminders
  where delivered_at is null and remind_at <= now()
  order by remind_at limit 200
  for update skip locked
)
returning *;
```

Marcar antes de enviar significa que un recordatorio puede perderse si el envío
falla después del `update`. Es exactamente lo que el spec pide: "cada recordatorio
se entrega como máximo una vez; si no llegó a tiempo, no se reintenta". El orden
inverso —enviar y después marcar— produce duplicados ante cualquier reintento o
ejecución solapada del cron, que es el único fallo que el criterio de aceptación
prohíbe explícitamente.

`for update skip locked` evita que dos ejecuciones solapadas del cron se pisen. El
índice parcial sobre `remind_at where delivered_at is null` es lo que hace que esta
consulta no escanee la tabla entera cada minuto.

Las suscripciones que devuelven 404 o 410 se borran en el mismo ciclo. Los
recordatorios relativos guardan `offset_minutes` y se recalculan cuando cambia la
fecha o la hora de la tarea; se recalculan solo los que aún tienen `delivered_at`
nulo.

### D-D. El ancla de la recurrencia se deriva de la regla, sin columna nueva

El spec dice que la próxima fecha sale "de la fecha de vencimiento original o de la
fecha de completado, según cómo esté configurada la repetición", pero no define
dónde se configura. Se deriva del propio RRULE, con una función pura:

- Regla **anclada al calendario** (`BYDAY`, `BYMONTHDAY`, `BYMONTH` — "cada lunes",
  "cada día laborable", "cada mes") → la próxima ocurrencia se calcula desde la
  fecha de vencimiento. "Cada lunes" tiene que seguir cayendo lunes.
- Regla de **intervalo puro** (`FREQ=DAILY;INTERVAL=3`, sin `BY*`) → se calcula
  desde la fecha de completado. "Regar las plantas cada 3 días" cuenta desde que
  se regó.

Sin columna, sin control en la interfaz, sin migración. El comportamiento sale de lo
que el usuario ya escribió.

*Alternativa descartada:* una columna `recurrence_anchor`. Es un control más que
explicar, para una distinción que la regla ya expresa sin ambigüedad.

### D-E. Una recurrente vencida no se adelanta sola

Una tarea recurrente vencida **queda vencida** y se muestra en el bloque de
atrasadas, como cualquier otra. El sistema nunca la adelanta por el paso del
tiempo ni genera las ocurrencias perdidas.

Al completarla, la siguiente instancia se agenda en **la primera ocurrencia de la
regla estrictamente posterior a hoy**. Las ocurrencias perdidas se descartan: no se
acumulan tareas atrasadas.

> Supuesto explícito, para revisar: "pasa a la otra recurrencia" se interpreta como
> la próxima ocurrencia *futura*, no la inmediatamente siguiente a la vencida.
> Avanzar una sola ocurrencia dejaría la tarea vencida otra vez, y completarla tres
> semanas seguidas para ponerse al día es justo lo que esta decisión evita.

Si la serie terminó (`recurrence_ends_at` pasado o `recurrence_count` agotado), no
se crea nada. Se hereda proyecto, sección, título, descripción, prioridad, duración,
fecha límite y etiquetas — no subtareas, comentarios ni recordatorios.

### D-F. Deshacer es una pila de operaciones inversas, en memoria

Contexto de React con `useReducer` en `lib/undo/`, sin librería, coherente con D12.
Cada mutación deshacible empuja un descriptor con su etiqueta en español y un thunk
que revierte. Pila acotada a 20 acciones, por sesión: no se persiste ni se
sincroniza.

`Ctrl/Cmd+Z` es el único atajo que se dispara con el foco en un campo de texto. Se
registra en fase de captura y solo actúa si el campo enfocado no tiene su propio
historial de edición — el editor Tiptap se deshace a sí mismo primero.

El toast de deshacer y la pila comparten el mismo descriptor: una acción destructiva
muestra el toast *y* entra en la pila. Deshacer desde el toast la saca de la pila,
para no deshacerla dos veces.

**El borrado de proyecto no entra en la pila.** El spec es explícito: no es
reversible, exige confirmación con conteo. Igual para el borrado de etiqueta, que ya
avisa que no se puede deshacer.

Restaurar una tarea eliminada pasa a restaurar también `task_labels` y sus
comentarios, que hoy `lib/tasks/restore.ts` pierde. Es el único cambio de
comportamiento observable sobre algo ya entregado.

### D-G. Un solo listener de teclado, con pila de contextos

`lib/shortcuts/` registra **un** listener en la raíz de la aplicación. Las pantallas
y los modales registran sus bindings en una pila de contextos; el contexto más
específico gana. Eso resuelve las tres colisiones que el spec deja abiertas:

| Tecla | Colisión | Resolución |
| --- | --- | --- |
| `S` | buscador (global) vs editor de secciones (Bandeja) | En Bandeja gana secciones; en el resto, buscador |
| `E` | nuevo evento (global, fase 4) vs etiquetas (detalle) | Con el detalle abierto gana etiquetas; el global no existe todavía |
| `T` | acorde `G T` (Hoy) vs fecha (menú contextual) | El acorde se resuelve antes: mientras `G` está pendiente, ninguna tecla suelta se dispara |

El acorde `G` espera 1,5 segundos y se cancela con `Escape` o con cualquier tecla
que no sea parte del acorde. Salvo `Ctrl/Cmd+Z`, ningún atajo se dispara si el
`activeElement` es un `input`, `textarea` o `contenteditable`, ni si hay un modal
que no registró ese binding.

### D-H. Las opciones de vista viven en `view_preferences`, una fila por pantalla

Tabla nueva `view_preferences(user_id, view_key text, options jsonb)`, PK compuesta
`(user_id, view_key)`, con la RLS estándar. `view_key` es `bandeja`, `hoy`,
`proximos`, `proyecto:<id>`, `etiqueta:<id>` o `filtro:<id>`.

Se sincroniza entre dispositivos y sobrevive a limpiar el navegador. `jsonb`
validado con Zod al leer, con los defaults de D25 aplicados a lo que falte: Hoy
ordena por hora, Completado por fecha de completado descendente, Bandeja y Proyecto
por orden manual. Una clave desconocida se ignora en vez de romper la vista.

*Alternativa descartada:* `localStorage`. D28 justamente eliminó una persistencia
así, y no sincroniza. *Alternativa descartada:* una columna `jsonb` en
`user_preferences` — se convierte en un objeto que crece sin límite con una clave
por proyecto, y cualquier cambio de opción reescribe la fila entera.

Las filas de proyectos, etiquetas y filtros eliminados quedan huérfanas: se limpian
por FK cuando la clave lo permite, y el resto se ignora al leer.

### D-I. El modo panel reusa `@dnd-kit`, ya instalado

Hoy `@dnd-kit` se usa solo con `verticalListSortingStrategy` para reordenar. El
panel suma arrastre entre columnas. Columnas: por sección en Bandeja y Proyecto; un
día por columna más "Sin fecha" en Próximos.

Por D24, arrastrar entre columnas no puede ser la única forma de hacer nada: mover
de sección y cambiar la fecha ya existen en el menú contextual, así que el arrastre
es un atajo, no una capacidad exclusiva.

Coherente con lo que ya rige la lista, el arrastre solo está disponible con orden
manual y sin agrupación activa.

### D-J. Vista Próximos: ventana de 7 días por defecto, con las atrasadas arriba

El spec dice "ventana configurable de una semana a tres meses" pero no fija el
default: 7 días. Las atrasadas se muestran en un bloque propio arriba de todo,
igual que en Hoy — quedan afuera de la ventana pero no se esconden.

El spec deja una tensión: la lista "deja afuera las tareas sin fecha" pero el panel
tiene columna "Sin fecha". Se respeta literal: la lista las excluye, el panel las
muestra en su columna, y ahí el arrastre sirve para darles fecha.

`user_preferences.default_view` amplía su check constraint para aceptar `proximos`.

## Risks / Trade-offs

**Compilar un AST del usuario a SQL es la superficie de riesgo más grande del
cambio** → La función solo compila desde una lista blanca de campos y operadores;
todo valor entra como parámetro, nunca concatenado; el AST se valida con Zod antes
de salir del cliente y otra vez contra la forma esperada dentro de la función. Un
AST malformado devuelve error, no un `where` vacío que muestre tareas de otro
usuario. `SECURITY INVOKER` deja la RLS como última línea de defensa. Tests de RLS
específicos para `buscar_tareas` con un AST hostil.

**Marcar el recordatorio antes de enviarlo puede perder una notificación** → Es la
decisión deliberada de D-C, alineada con el spec. El riesgo real es perder muchas de
golpe si la edge function falla sistemáticamente: se registra el resultado de cada
envío y se alerta si la tasa de fallo pasa un umbral.

**`pg_cron` cada minuto es infraestructura nueva sin precedente en el proyecto** →
El lote está acotado a 200 por ejecución y la consulta va por el índice parcial. Si
el cron se cae, los recordatorios no se entregan y por diseño no se reintentan:
conviene monitorearlo desde el primer día.

**Doce funcionalidades en un solo cambio es mucho para revisar de una** → Las tareas
se agrupan en tandas independientes, cada una entregable y verificable por separado.
La tanda de esquema va primero porque casi todo depende de ella.

**Subagentes en paralelo sobre el mismo árbol** → Ninguna tanda paralela toca los
mismos archivos, y nadie corre `git stash` ni `git reset`. Las migraciones se
numeran de antemano para que dos tandas no colisionen en el nombre del archivo.

**El gate en verde no prueba nada** → `pnpm lint && pnpm typecheck && pnpm test`
pasa con funcionalidades rotas. Cada tanda se verifica abriendo el navegador, y los
criterios de aceptación del roadmap se comprueban a mano antes de dar la fase por
terminada.

**`tasks.description_text` puede desincronizarse de `description`** → Se escriben en
el mismo update, en un único lugar del código. Si aun así divergen, el efecto es un
resultado de búsqueda desactualizado, no un dato perdido.

## Migration Plan

1. **Extensiones y configuración**: `unaccent`, `pg_cron`, `pg_net`, y la
   configuración `spanish_unaccent`. Migración propia, sin cambios de esquema.
2. **Tablas nuevas**, una migración por tabla con su RLS en el mismo archivo:
   `comments`, `reminders`, `push_subscriptions`, `filters`, `view_preferences`.
3. **Cambios sobre `tasks`**: `description_text`, `search_vector` generada, índice
   GIN. `description_text` arranca nula y se llena al primer guardado de cada tarea;
   un backfill opcional la completa para las existentes.
4. **`user_preferences`**: ampliar el check de `default_view` con `proximos`.
5. **Publicación de realtime**: sumar `comments`, `reminders` y `filters`.
6. **`pnpm db:types`** después de cada tanda de migraciones.
7. **Variables de entorno**: claves VAPID en Vercel y en Supabase antes de desplegar
   la edge function.

Rollback: las tablas nuevas se pueden dropear sin tocar datos existentes. Lo único
no trivial de revertir es `search_vector` y `description_text` sobre `tasks`, que se
dropean sin pérdida porque son derivadas. El check de `default_view` se revierte
solo si ningún usuario eligió `proximos`.

## Open Questions

- La interpretación de "pasa a la otra recurrencia" como próxima ocurrencia futura
  (D-E) es un supuesto declarado, no una respuesta literal. Confirmar al revisar.
- El spec no fija un límite de filtros ni de etiquetas favoritas. Se implementa sin
  límite; si aparece un problema de espacio en el panel lateral, la lista colapsable
  que el spec ya pide lo absorbe.
- El spec no define si las páginas de Etiqueta y Filtro tienen barra de opciones de
  vista (solo la nombra en Bandeja, Hoy, Próximos y Proyecto), pero sí que soportan
  selección múltiple. Se les da la barra por coherencia, y `view_key` ya contempla
  sus claves.
