## ADDED Requirements

### Requirement: El día muestra cuánto tiempo suma lo planificado

Hoy SHALL mostrar, en su encabezado, la suma del tiempo de lo que hay planificado ese
día, formateado como duración legible ("5h 20m planificadas"). El total SHALL mostrarse
en las tres formas de ver, porque el encabezado es común a las tres.

El total NUNCA SHALL acompañarse de un color de alerta, un ícono de advertencia, una
comparación contra el tiempo disponible ni un aviso de sobrecarga. Es un dato
descriptivo.

#### Scenario: Hoy muestra el total planificado

- **WHEN** Hoy tiene dos tareas pendientes de 90 y 30 minutos, un hábito pendiente de 20
  minutos y un evento de una hora
- **THEN** el encabezado muestra "4h planificadas"

#### Scenario: El total aparece en las tres formas de ver

- **WHEN** se cambia la forma de ver de Hoy entre lista, panel y calendario
- **THEN** el total planificado sigue visible en el encabezado

#### Scenario: El total no juzga

- **WHEN** un día suma catorce horas planificadas
- **THEN** el total se muestra con el mismo tratamiento visual que cualquier otro día
- **AND** NUNCA SHALL mostrarse una advertencia de que no entra

### Requirement: Qué entra en el total

El total SHALL sumar la duración estimada de las tareas pendientes que vencen ese día,
la de los hábitos pendientes de ese día, y la duración de los eventos con horario del
calendario conectado.

NUNCA SHALL sumar: tareas completadas, hábitos completados, hábitos salteados, eventos
de todo el día, ni ningún elemento sin duración.

En Hoy, las tareas **atrasadas** SHALL entrar en el total, porque se muestran en esa
pantalla y son trabajo de ese día. Cuando el total incluye atrasadas, SHALL decirlo.

Un hábito SHALL considerarse pendiente según la misma definición que ya usan los
contadores de la aplicación: toca ese día, no está archivado, no es anterior a su
creación, no fue marcado y no fue salteado.

#### Scenario: Lo completado no se suma

- **WHEN** un día tiene una tarea pendiente de 30 minutos y otra ya completada de 2 horas
- **THEN** el total muestra 30 minutos

#### Scenario: Un hábito salteado no se suma

- **WHEN** un hábito de 20 minutos se saltea ese día
- **THEN** su duración NUNCA SHALL entrar en el total de ese día

#### Scenario: Un evento de todo el día no se suma

- **WHEN** el día tiene un evento de todo el día y uno de 45 minutos
- **THEN** el total suma solo los 45 minutos

#### Scenario: Las atrasadas entran en el total de Hoy y se dicen

- **WHEN** Hoy tiene una tarea de hoy de 1 hora y dos tareas atrasadas de 30 minutos cada una
- **THEN** el total muestra 2 horas
- **AND** el texto indica que el total incluye tareas atrasadas

### Requirement: Lo que no tiene duración se cuenta aparte

Lo que no tiene duración estimada NUNCA SHALL sumarse al total, pero SHALL informarse
cuántos elementos quedaron sin medir. Un total que omite elementos en silencio NUNCA
SHALL mostrarse.

Cuando ningún elemento del día tiene duración, NUNCA SHALL mostrarse un total de cero:
SHALL mostrarse únicamente el conteo de lo que no se pudo medir.

#### Scenario: Se informan las tareas sin duración

- **WHEN** un día tiene tres tareas con duración que suman 5 horas 20 minutos y cuatro
  tareas sin duración
- **THEN** se muestra "5h 20m planificadas" junto con la indicación de que hay 4 sin duración

#### Scenario: Un día donde nada tiene duración no muestra cero

- **WHEN** un día tiene cinco tareas y ninguna tiene duración estimada
- **THEN** NUNCA SHALL mostrarse "0m planificadas"
- **AND** SHALL indicarse que las 5 no tienen duración

#### Scenario: Todo con duración no muestra el aparte

- **WHEN** todas las tareas y hábitos del día tienen duración
- **THEN** solo se muestra el total, sin ninguna indicación adicional

### Requirement: El total se calcula igual sin calendario conectado

El total SHALL calcularse y mostrarse con la información disponible aunque el calendario
no esté conectado, esté cargando, o Google no responda. En ninguno de esos casos SHALL
mostrarse un hueco, un error o un aviso de que faltan eventos.

#### Scenario: Sin calendario conectado el total se muestra igual

- **WHEN** la cuenta no tiene ningún calendario de Google conectado
- **THEN** el total se muestra sumando tareas y hábitos
- **AND** NUNCA SHALL mostrarse un aviso de que faltan eventos

#### Scenario: Google caído no rompe el total

- **WHEN** la consulta de eventos devuelve un estado de no disponible
- **THEN** el total se muestra igual con tareas y hábitos

### Requirement: Formato de la duración

El total SHALL formatearse con el mismo criterio que la duración de un hábito ya usa en
la aplicación: horas y minutos sin ceros a la izquierda, y sin minutos cuando las horas
son exactas.

#### Scenario: Horas exactas no muestran minutos

- **WHEN** el total es de 120 minutos
- **THEN** se muestra "2h", NUNCA "2h 0m"

#### Scenario: Menos de una hora muestra solo minutos

- **WHEN** el total es de 45 minutos
- **THEN** se muestra "45m"
