# lenguaje-de-consulta Specification

## Purpose
TBD - created by archiving change fase-2-potencia. Update Purpose after archive.
## Requirements
### Requirement: Campo `priority` filtra por prioridad numérica combinable

El campo `priority` SHALL aceptar uno o más valores enteros del `1` al `4`,
separados por coma, y SHALL seleccionar las tareas cuya prioridad coincida con
alguno de los valores indicados.

#### Scenario: Un solo valor de prioridad

- **WHEN** se evalúa `priority:1`
- **THEN** el resultado incluye solo tareas con `priority = 1`

#### Scenario: Varios valores combinados con coma

- **WHEN** se evalúa `priority:1,2`
- **THEN** el resultado incluye tareas con `priority = 1` o `priority = 2`
- **AND** una tarea con `priority = 3` no aparece

### Requirement: Campo `due` filtra por fecha de vencimiento

El campo `due` SHALL aceptar los valores `today`, `tomorrow`, `overdue`,
`nodate`, `next7days`, `next30days`, una fecha exacta en formato `YYYY-MM-DD`,
o los comparadores `due:before:FECHA` y `due:after:FECHA`. La fecha de
vencimiento de una tarea SHALL tomarse de `due_date` o de la parte de fecha de
`due_at`, cualquiera de las dos que esté presente.

#### Scenario: `today` selecciona solo lo que vence hoy

- **WHEN** se evalúa `due:today` un 2026-07-29
- **THEN** el resultado incluye solo tareas cuyo `due_date` o la fecha de
  `due_at` es `2026-07-29`

#### Scenario: `overdue` selecciona lo vencido y pendiente

- **WHEN** se evalúa `due:overdue` un 2026-07-29
- **THEN** el resultado incluye tareas pendientes con fecha de vencimiento
  anterior a `2026-07-29`
- **AND** una tarea ya completada con esa misma fecha vencida no aparece,
  salvo que la consulta también pida `completed:true`

#### Scenario: `nodate` selecciona lo que no tiene fecha

- **WHEN** se evalúa `due:nodate`
- **THEN** el resultado incluye solo tareas con `due_date` y `due_at` ambos
  nulos

#### Scenario: `next7days` y `next30days` son ventanas distintas

- **WHEN** se evalúa `due:next7days` un 2026-07-29
- **THEN** el resultado incluye tareas con fecha de vencimiento entre
  2026-07-29 y 2026-08-05 inclusive
- **AND** una tarea que vence el 2026-08-20 no aparece en `due:next7days`
- **AND** esa misma tarea sí aparece al evaluar `due:next30days`

#### Scenario: Fecha exacta

- **WHEN** se evalúa `due:2026-08-10`
- **THEN** el resultado incluye solo tareas cuya fecha de vencimiento es
  exactamente `2026-08-10`

#### Scenario: Comparadores `before` y `after`

- **WHEN** se evalúa `due:before:2026-08-01`
- **THEN** el resultado incluye tareas con fecha de vencimiento estrictamente
  anterior a `2026-08-01`
- **WHEN** se evalúa `due:after:2026-08-01`
- **THEN** el resultado incluye tareas con fecha de vencimiento estrictamente
  posterior a `2026-08-01`

### Requirement: Campo `label` filtra por nombre de etiqueta

El campo `label` SHALL aceptar uno o más nombres de etiqueta separados por
coma, y SHALL seleccionar las tareas que tengan asignada al menos una de esas
etiquetas. La comparación del nombre SHALL hacerse sin distinguir mayúsculas
ni acentos, igual que en el resto de la aplicación.

#### Scenario: Coincidencia sin distinguir mayúsculas ni acentos

- **WHEN** existe una etiqueta `Café` y se evalúa `label:CAFE`
- **THEN** el resultado incluye las tareas que tienen asignada la etiqueta
  `Café`

#### Scenario: Varias etiquetas combinadas con coma

- **WHEN** se evalúa `label:trabajo,personal`
- **THEN** el resultado incluye tareas que tengan asignada la etiqueta
  `trabajo`, la etiqueta `personal`, o ambas

### Requirement: Campo `project` filtra por nombre de proyecto

El campo `project` SHALL aceptar uno o más nombres de proyecto separados por
coma, y SHALL seleccionar las tareas que pertenezcan a alguno de esos
proyectos. La comparación del nombre SHALL hacerse sin distinguir mayúsculas
ni acentos.

#### Scenario: Coincidencia sin distinguir mayúsculas ni acentos

- **WHEN** existe un proyecto `Mudanza` y se evalúa `project:mudanza`
- **THEN** el resultado incluye las tareas del proyecto `Mudanza`

#### Scenario: Varios proyectos combinados con coma

- **WHEN** se evalúa `project:trabajo,casa`
- **THEN** el resultado incluye tareas del proyecto `trabajo` o del proyecto
  `casa`

### Requirement: Campo `completed` filtra por estado de completado

El campo `completed` SHALL aceptar `true` o `false`. Si la consulta no
menciona el campo `completed` en ningún punto, el resultado SHALL excluir las
tareas completadas por defecto.

#### Scenario: `completed:true` muestra solo lo completado

- **WHEN** se evalúa `completed:true`
- **THEN** el resultado incluye solo tareas con `completed_at` distinto de
  nulo

#### Scenario: Sin mencionar `completed`, lo completado queda afuera

- **WHEN** se evalúa `priority:1` sin ninguna referencia a `completed`
- **THEN** el resultado incluye solo tareas pendientes con `priority = 1`
- **AND** una tarea completada con `priority = 1` no aparece

### Requirement: Campo `search` usa el mismo motor que el buscador

El campo `search` SHALL aceptar un texto y SHALL seleccionar las tareas cuyo `search_vector` coincida con ese texto evaluado contra la configuración de búsqueda `spanish_unaccent`, exactamente el mismo mecanismo que usa la capacidad `buscador` sobre la misma columna, insensible a mayúsculas y a acentos, con `spanish_stem`, y sin corregir errores de tipeo.

#### Scenario: Coincidencia en el título

- **WHEN** existe una tarea titulada "Pagar el alquiler" y se evalúa
  `search:alquiler`
- **THEN** esa tarea aparece en el resultado

#### Scenario: Insensible a acentos, igual que el buscador

- **WHEN** existe una tarea titulada "Reunión" y se evalúa `search:reunion`
- **THEN** esa tarea aparece en el resultado, porque `search:` consulta el
  mismo `search_vector` con la misma configuración `spanish_unaccent` que usa
  el buscador

#### Scenario: El stemming encuentra la forma singular

- **WHEN** existe una tarea titulada "Reunión" y se evalúa `search:reuniones`
- **THEN** esa tarea aparece en el resultado, por el mismo `spanish_stem` que
  ya aplica el buscador

#### Scenario: No corrige errores de tipeo

- **WHEN** se evalúa `search:renuion` (con un error de tipeo)
- **THEN** el resultado no incluye ninguna tarea, porque `spanish_unaccent` no
  corrige errores de tipeo, igual que en el buscador

#### Scenario: El resultado es idéntico al del buscador

- **WHEN** se evalúa `search:reunion` y, por separado, se usa el buscador con
  el mismo texto "reunion" sobre el mismo conjunto de tareas
- **THEN** ambos devuelven el mismo conjunto de tareas, porque los dos
  consultan `tasks.search_vector` con la configuración `spanish_unaccent`

### Requirement: Campo `recurring` filtra por tareas recurrentes

El campo `recurring` SHALL aceptar `true` o `false` y SHALL seleccionar las
tareas según tengan o no una regla de recurrencia (`recurrence_rule`)
configurada.

#### Scenario: `recurring:true` solo muestra tareas con regla de recurrencia

- **WHEN** se evalúa `recurring:true`
- **THEN** el resultado incluye solo tareas con `recurrence_rule` distinto de
  nulo
- **AND** una tarea sin recurrencia configurada no aparece

### Requirement: Campo `subtask` filtra por tareas que son subtareas

El campo `subtask` SHALL aceptar `true` o `false` y SHALL seleccionar las
tareas según tengan o no un `parent_id` asignado.

#### Scenario: `subtask:true` solo muestra subtareas

- **WHEN** se evalúa `subtask:true`
- **THEN** el resultado incluye solo tareas con `parent_id` distinto de nulo
- **WHEN** se evalúa `subtask:false`
- **THEN** el resultado incluye solo tareas de primer nivel, con `parent_id`
  nulo

### Requirement: Campo `created` filtra por fecha de creación

El campo `created` SHALL aceptar una fecha exacta en formato `YYYY-MM-DD`, o
los comparadores `created:before:FECHA` y `created:after:FECHA`, evaluados
contra la fecha de `created_at` de la tarea.

#### Scenario: Fecha exacta de creación

- **WHEN** se evalúa `created:2026-07-01`
- **THEN** el resultado incluye solo tareas creadas ese día

#### Scenario: Comparadores `before` y `after` sobre la creación

- **WHEN** se evalúa `created:after:2026-07-01`
- **THEN** el resultado incluye solo tareas creadas después del 2026-07-01

### Requirement: Campo `no_project` filtra las tareas de la Bandeja de entrada

El campo `no_project` SHALL aceptar `true` o `false` y SHALL seleccionar las
tareas según pertenezcan o no al proyecto marcado como Bandeja de entrada
(`is_inbox = true`).

#### Scenario: `no_project:true` muestra solo la Bandeja

- **WHEN** se evalúa `no_project:true`
- **THEN** el resultado incluye solo tareas cuyo proyecto tiene `is_inbox =
  true`
- **AND** una tarea de cualquier otro proyecto no aparece

### Requirement: Operadores lógicos, paréntesis y su precedencia fija

La consulta SHALL combinarse con los operadores `&` (y), `|` (o) y `!` (no), y
SHALL agruparse con paréntesis. La precedencia SHALL ser fija: `!` liga más
fuerte que `&`, y `&` liga más fuerte que `|`. El operador `!` SHALL poder
negar tanto un único campo como un grupo entre paréntesis.

#### Scenario: El ejemplo de referencia del criterio de aceptación

- **WHEN** se evalúa `(priority:1,2 & due:next7days) & !label:espera`
- **THEN** el resultado incluye tareas con `priority` 1 o 2, que vencen dentro
  de los próximos 7 días, y que no tienen asignada la etiqueta `espera`
- **AND** una tarea que cumple lo anterior pero tiene asignada la etiqueta
  `espera` no aparece

#### Scenario: `&` liga más fuerte que `|` sin paréntesis

- **WHEN** se evalúa `priority:1 | priority:2 & due:today`
- **THEN** el resultado es equivalente a evaluar
  `priority:1 | (priority:2 & due:today)`
- **AND** una tarea con `priority:1` que no vence hoy igual aparece en el
  resultado

#### Scenario: `!` niega solo el token que sigue, no toda la expresión

- **WHEN** se evalúa `!label:espera & due:today`
- **THEN** el resultado es equivalente a evaluar
  `(!label:espera) & due:today`
- **AND** una tarea sin la etiqueta `espera` que no vence hoy no aparece

#### Scenario: `!` sobre un grupo entre paréntesis niega todo el grupo

- **WHEN** se evalúa `!(label:espera | label:pausada)`
- **THEN** el resultado excluye toda tarea que tenga asignada la etiqueta
  `espera`, la etiqueta `pausada`, o ambas

### Requirement: La coma dentro de un campo equivale a un "o"

Cuando un campo acepta varios valores separados por coma, esa coma SHALL
interpretarse como una disyunción (`|`) entre esos valores, nunca como una
conjunción.

#### Scenario: Equivalencia entre coma y `|` explícito

- **WHEN** se evalúa `priority:1,2`
- **THEN** el resultado es idéntico al de evaluar `priority:1 | priority:2`

### Requirement: Los nombres con espacios van entre comillas dobles

Un nombre de etiqueta o de proyecto que contenga espacios SHALL escribirse
entre comillas dobles. Sin comillas, el nombre SHALL terminar en el primer
espacio, coma o paréntesis que aparezca, y cualquier texto posterior SHALL
tratarse como parte de la consulta.

#### Scenario: Nombre con espacios entre comillas

- **WHEN** existe una etiqueta `En espera` y se evalúa
  `label:"en espera"`
- **THEN** el resultado incluye las tareas con esa etiqueta asignada

#### Scenario: El mismo nombre sin comillas produce un error de sintaxis

- **WHEN** se evalúa `label:en espera` sin comillas
- **THEN** el parser interpreta `en` como el valor completo del campo `label`
- **AND** la palabra suelta `espera` que sigue produce un error de sintaxis en
  español, señalando la posición donde empieza `espera`

### Requirement: Errores de sintaxis en español que señalan la posición

Ante una consulta con un error de sintaxis, el parser SHALL producir un
mensaje en español que indica el tipo de error y la posición exacta (índice de
carácter) donde ocurre, en vez de un mensaje genérico o en inglés.

#### Scenario: Campo desconocido

- **WHEN** se evalúa `estado:abierto`
- **THEN** se produce un error en español del tipo "campo desconocido"
- **AND** la posición señalada corresponde al inicio de `estado`

#### Scenario: Valor inválido para un campo

- **WHEN** se evalúa `priority:5`
- **THEN** se produce un error en español indicando que la prioridad debe ser
  un valor entre 1 y 4
- **AND** la posición señalada corresponde al `5`

#### Scenario: Paréntesis sin cerrar

- **WHEN** se evalúa `(priority:1 & due:today`
- **THEN** se produce un error en español indicando que falta un paréntesis
  de cierre
- **AND** la posición señalada corresponde al final de la consulta

### Requirement: La evaluación corre en Postgres con RLS activa

El AST producido por el parser SHALL enviarse como `jsonb` a una función de
Postgres (`buscar_tareas`) declarada `SECURITY INVOKER`, de modo que la
política de RLS del usuario autenticado permanezca activa durante toda la
evaluación. Un AST inválido o mal formado SHALL producir un error, y MUST NOT
producir un conjunto vacío ni tareas de otro usuario.

#### Scenario: La RLS sigue aislando por usuario dentro de la función

- **WHEN** el usuario A ejecuta cualquier consulta válida contra
  `buscar_tareas`
- **THEN** el resultado solo contiene tareas cuyo `user_id` es el del usuario A
- **AND** ninguna tarea del usuario B aparece, sin importar qué pida la
  consulta

#### Scenario: Un AST malformado devuelve error, no un resultado vacío silencioso

- **WHEN** se envía a `buscar_tareas` un `jsonb` que no cumple la forma
  esperada (por ejemplo, con un campo fuera de la lista blanca)
- **THEN** la función devuelve un error
- **AND** el error MUST NOT confundirse en la interfaz con "no hay tareas que
  coincidan"

