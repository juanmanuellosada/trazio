## ADDED Requirements

### Requirement: Frecuencias de recurrencia reconocidas

El sistema SHALL interpretar correctamente, para calcular la siguiente ocurrencia, las siguientes frecuencias: cada día, cada semana, cada mes, cada año, cada 2 semanas, cada 3 días, cada 2 meses, cada 2 años, cada lunes (o cualquier otro día de la semana suelto), y cada día laborable.

#### Scenario: "Cada 2 semanas" calcula la siguiente ocurrencia dos semanas después

- **WHEN** se completa una tarea con regla "cada 2 semanas" cuya fecha de
  vencimiento era un jueves
- **THEN** la siguiente instancia se agenda para el jueves de dentro de dos
  semanas

#### Scenario: "Cada día laborable" salta el fin de semana

- **WHEN** se completa un viernes una tarea con regla "cada día laborable"
  cuya fecha de vencimiento era ese mismo viernes
- **THEN** la siguiente instancia se agenda para el lunes siguiente, no para
  el sábado

### Requirement: Generar la siguiente ocurrencia al completar una tarea recurrente

Al completar una tarea que tiene `recurrence_rule`, SHALL crearse
automáticamente la siguiente instancia, heredando proyecto, sección, título,
descripción, prioridad, duración estimada, fecha límite (`deadline`) y
etiquetas de la tarea completada. La siguiente instancia NUNCA SHALL heredar
las subtareas, los comentarios ni los recordatorios de la tarea completada.

#### Scenario: Completar una tarea recurrente crea la siguiente heredando sus campos

- **WHEN** se completa una tarea recurrente con proyecto, sección, título,
  descripción, prioridad, duración estimada, fecha límite y dos etiquetas
- **THEN** se crea una nueva tarea pendiente con el mismo proyecto, sección,
  título, descripción, prioridad, duración estimada, fecha límite y las
  mismas dos etiquetas

#### Scenario: La siguiente instancia no hereda subtareas, comentarios ni recordatorios

- **WHEN** se completa una tarea recurrente que tiene subtareas, comentarios
  en su hilo y recordatorios configurados
- **THEN** la nueva instancia se crea sin ninguna subtarea, sin ningún
  comentario y sin ningún recordatorio

### Requirement: El ancla de la recurrencia se deriva del tipo de regla

El sistema SHALL calcular la fecha de la siguiente ocurrencia según el tipo
de regla. Una regla anclada al calendario (que use `BYDAY`, `BYMONTHDAY` o
`BYMONTH` — por ejemplo "cada lunes", "cada día laborable" o "cada mes")
calcula desde la fecha de vencimiento original de la tarea completada. Una
regla de intervalo puro (por ejemplo `FREQ=DAILY;INTERVAL=3`, sin ningún
componente `BY*`) calcula desde la fecha de completado.

#### Scenario: Una regla anclada al calendario calcula desde el vencimiento

- **WHEN** se completa una tarea con regla "cada lunes" cuya fecha de
  vencimiento era un lunes, y se completa un miércoles de esa misma semana
- **THEN** la siguiente instancia se agenda para el lunes siguiente al
  vencimiento original, no para el lunes contado desde el miércoles de
  completado

#### Scenario: Una regla de intervalo puro calcula desde el completado

- **WHEN** se completa una tarea con regla "cada 3 días" (`FREQ=DAILY;
  INTERVAL=3`) el día 10, habiendo vencido originalmente el día 8
- **THEN** la siguiente instancia se agenda para el día 13, tres días después
  del completado, no tres días después del vencimiento original

### Requirement: Una tarea recurrente vencida no se adelanta sola

Una tarea recurrente vencida NUNCA SHALL adelantarse automáticamente por el
paso del tiempo: queda vencida y se muestra en el bloque de atrasadas, igual
que cualquier otra tarea vencida. Al completarla, la siguiente instancia SHALL
agendarse en la primera ocurrencia de la regla estrictamente posterior a hoy.
Las ocurrencias intermedias que quedaron sin completar SHALL descartarse sin
acumularse.

#### Scenario: Una recurrente vencida no genera ninguna ocurrencia por sí sola

- **WHEN** una tarea recurrente queda vencida y pasan varios días sin que se
  la complete
- **THEN** la tarea sigue mostrándose vencida, en el bloque de atrasadas
- **AND** no se genera automáticamente ninguna instancia nueva

#### Scenario: Completar una recurrente vencida agenda la siguiente ocurrencia futura sin acumular las perdidas

- **WHEN** se completa hoy una tarea recurrente diaria cuya fecha de
  vencimiento quedó atrasada tres días
- **THEN** la siguiente instancia se agenda en la primera ocurrencia
  estrictamente posterior a hoy
- **AND** no se crea ninguna instancia para los días atrasados que se
  perdieron

### Requirement: Fin de la serie recurrente

Al completar una tarea, NUNCA SHALL crearse una instancia siguiente si la
serie terminó: porque `recurrence_ends_at` ya pasó, o porque se alcanzó
`recurrence_count`.

#### Scenario: Una serie con fecha tope vencida no genera la siguiente instancia

- **WHEN** se completa una tarea recurrente cuyo `recurrence_ends_at` ya pasó
- **THEN** no se crea ninguna instancia nueva

#### Scenario: Una serie que alcanzó su cantidad de repeticiones no genera la siguiente instancia

- **WHEN** se completa una tarea recurrente que ya alcanzó el
  `recurrence_count` configurado para la serie
- **THEN** no se crea ninguna instancia nueva

### Requirement: Vista previa de repeticiones futuras

El sistema SHALL ofrecer una opción para mostrar las próximas repeticiones de
una tarea recurrente como bloques de vista previa, distinguibles de las
tareas reales.

#### Scenario: Activar la vista previa muestra las próximas ocurrencias como bloques

- **WHEN** se activa la opción de mostrar repeticiones futuras sobre una vista
  que incluye una tarea recurrente
- **THEN** se muestran bloques de vista previa para las próximas ocurrencias
  de esa tarea, visualmente distinguibles de las tareas reales pendientes

### Requirement: Filtro por tareas recurrentes

El campo de filtro `recurring:true` SHALL mostrar únicamente tareas que
tienen `recurrence_rule`. El campo `recurring:false` SHALL excluir esas
tareas.

#### Scenario: recurring:true muestra solo tareas recurrentes

- **WHEN** se aplica el filtro `recurring:true`
- **THEN** los resultados incluyen únicamente tareas con `recurrence_rule`
  definida

#### Scenario: recurring:false excluye las tareas recurrentes

- **WHEN** se aplica el filtro `recurring:false`
- **THEN** los resultados no incluyen ninguna tarea con `recurrence_rule`
  definida
