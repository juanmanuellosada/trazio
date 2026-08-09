# recordatorios-de-habitos Specification

## Purpose
TBD - created by archiving change recordatorios-de-habitos. Update Purpose after archive.
## Requirements
### Requirement: Un hábito puede tener varios recordatorios, todos relativos a su hora

Un hábito SHALL poder tener varios recordatorios push. Cada recordatorio SHALL
configurarse **únicamente** como un desfase relativo a la hora del hábito: a la
hora, 10, 15, 30 o 45 minutos antes, o 1, 2 o 3 horas antes.

NUNCA SHALL ofrecerse un recordatorio puntual con fecha y hora absolutas sobre un
hábito: un hábito se repite, y un instante fijo solo tendría sentido la primera vez.

Un mismo desfase NUNCA SHALL poder agregarse dos veces al mismo hábito.

#### Scenario: Un hábito puede tener dos recordatorios distintos

- **WHEN** se agregan a un hábito los recordatorios "a la hora" y "30 minutos antes"
- **THEN** los dos quedan asociados a ese hábito

#### Scenario: No se ofrece el recordatorio puntual

- **WHEN** se abre el control para agregar un recordatorio a un hábito
- **THEN** NUNCA SHALL ofrecerse una opción de fecha y hora absolutas
- **AND** todas las opciones ofrecidas SHALL ser desfases relativos a la hora del hábito

#### Scenario: El mismo desfase no se agrega dos veces

- **WHEN** se intenta agregar "30 minutos antes" a un hábito que ya tiene ese recordatorio
- **THEN** el recordatorio NUNCA SHALL duplicarse

### Requirement: El momento del aviso sale de la hora efectiva del hábito ese día

El instante de un recordatorio SHALL calcularse, para cada día en que el hábito toca,
sobre su **hora efectiva de ese día**, en la zona horaria del usuario, aplicándole el
desfase.

La hora efectiva SHALL resolverse en este orden:

1. La reprogramación puntual de ese día, si existe (`habit_schedule_overrides`).
2. La hora programada habitual del hábito (`habits.scheduled_time`).
3. Si el hábito no tiene hora programada ("todo el día"), la **hora de referencia**
   configurada por el usuario — la misma que usan las tareas sin hora.

#### Scenario: El aviso sale de la hora habitual del hábito

- **WHEN** un hábito programado a las 07:00 tiene un recordatorio "30 minutos antes"
- **THEN** el aviso SHALL enviarse a las 06:30 de la zona horaria del usuario

#### Scenario: Una reprogramación puntual corre el aviso de ese día

- **WHEN** un hábito de las 07:00 con un recordatorio "30 minutos antes" se reprograma
  a las 10:00 para el día de hoy
- **THEN** el aviso de hoy SHALL enviarse a las 09:30
- **AND** el aviso de los demás días SHALL seguir a las 06:30

#### Scenario: Un hábito sin hora usa la hora de referencia

- **WHEN** un hábito "todo el día" tiene un recordatorio "1 hora antes" y la hora de
  referencia del usuario es 09:00
- **THEN** el aviso SHALL enviarse a las 08:00

#### Scenario: Cambiar la zona horaria de la cuenta corre los avisos futuros

- **WHEN** el usuario cambia la zona horaria de su cuenta
- **THEN** los avisos futuros SHALL calcularse en la zona nueva, sin necesidad de
  reconfigurar ningún recordatorio

### Requirement: Solo se avisa lo que está pendiente ese día

Un recordatorio de hábito SHALL enviarse únicamente si, en el momento del envío, ese
hábito está pendiente ese día: toca por su frecuencia, la fecha no es anterior a su
creación, el hábito no está archivado, no fue marcado como hecho ese día y no fue
salteado ese día.

Un hábito de tipo "cierta cantidad de veces por semana" SHALL avisar todos los días
hasta que se lo marque, igual que aparece en Hoy — su noción de pendiente NUNCA SHALL
diferir de la que muestra la pantalla.

#### Scenario: Completar el hábito antes de la hora cancela el aviso

- **WHEN** un hábito con recordatorio a las 07:00 se marca como hecho a las 06:55
- **THEN** el aviso de las 07:00 NUNCA SHALL enviarse

#### Scenario: Saltear el día cancela el aviso

- **WHEN** un hábito con recordatorio se saltea ese día
- **THEN** el aviso de ese día NUNCA SHALL enviarse

#### Scenario: Un día que el hábito no toca no avisa

- **WHEN** un hábito de días específicos (lunes y miércoles) con recordatorio llega a un martes
- **THEN** NUNCA SHALL enviarse ningún aviso ese día

#### Scenario: Un hábito archivado no avisa

- **WHEN** un hábito con recordatorios se archiva
- **THEN** NUNCA SHALL enviarse ningún aviso suyo
- **AND** desarchivarlo SHALL devolver sus recordatorios intactos

#### Scenario: No se avisa antes de la creación del hábito

- **WHEN** un hábito se crea un miércoles con un recordatorio
- **THEN** NUNCA SHALL enviarse un aviso correspondiente a un día anterior a ese miércoles

#### Scenario: Un "veces por semana" avisa hasta que se marque

- **WHEN** un hábito de 3 veces por semana con recordatorio no se marcó hoy
- **THEN** el aviso de hoy SHALL enviarse, sin importar cuántas veces se lo marcó esta semana

### Requirement: Entrega única por hábito, día y desfase

Cada combinación de hábito, día y desfase SHALL entregarse como máximo una vez. El
mecanismo SHALL ser reclamar-antes-de-enviar: la fila de entrega se inserta en la misma
sentencia atómica que selecciona las ocurrencias vencidas, antes de intentar el envío,
y la clave primaria compuesta es la que impide el duplicado.

Un envío que falla NUNCA SHALL reintentarse.

Un aviso vencido hace más de 15 minutos NUNCA SHALL enviarse.

#### Scenario: Dos ejecuciones solapadas del cron no duplican la notificación

- **WHEN** dos ejecuciones del cron se solapan y ambas intentan procesar el mismo aviso
  de hábito vencido
- **THEN** solo una de las dos logra reclamarlo
- **AND** se envía como máximo una notificación

#### Scenario: Un envío fallido no se reintenta

- **WHEN** el envío de un aviso de hábito ya reclamado falla
- **THEN** ese aviso NUNCA SHALL volver a intentarse en ninguna ejecución posterior

#### Scenario: Un aviso demasiado viejo se descarta

- **WHEN** el cron estuvo caído una hora y vuelve
- **THEN** los avisos vencidos hace más de 15 minutos NUNCA SHALL enviarse
- **AND** los vencidos dentro de esos 15 minutos SHALL enviarse una sola vez

#### Scenario: El mismo hábito avisa de nuevo al día siguiente

- **WHEN** un hábito diario con recordatorio ya recibió su aviso hoy
- **THEN** SHALL recibir su aviso otra vez mañana, si mañana sigue pendiente

### Requirement: La notificación nombra el hábito y abre la pantalla de Hábitos

Al llegar el momento de un recordatorio de hábito, SHALL enviarse una notificación push
con el nombre del hábito como texto plano, a todas las suscripciones activas de esa
cuenta. Al tocarla, SHALL abrirse la pantalla de Hábitos.

#### Scenario: La notificación muestra el nombre del hábito

- **WHEN** llega el momento del recordatorio del hábito "Tomar agua"
- **THEN** se envía una notificación cuyo contenido es "Tomar agua" como texto plano

#### Scenario: Tocar la notificación abre Hábitos

- **WHEN** se toca la notificación de un recordatorio de hábito
- **THEN** se abre la pantalla de Hábitos

#### Scenario: Llega a todos los dispositivos suscritos

- **WHEN** la cuenta tiene dos dispositivos con recordatorios activados y llega el
  momento de un aviso de hábito
- **THEN** la notificación SHALL enviarse a las dos suscripciones

### Requirement: Los recordatorios se configuran desde el formulario del hábito

El formulario de creación y edición de un hábito SHALL ofrecer agregar y quitar
recordatorios. Cuando el hábito no tiene hora programada, el texto de las opciones SHALL
nombrar la hora de referencia, para que quede explícito contra qué se calcula el desfase.

Eliminar un hábito SHALL borrar en cascada sus recordatorios y su historial de entregas.

#### Scenario: Agregar un recordatorio al crear un hábito

- **WHEN** se crea un hábito y se le agrega el recordatorio "15 minutos antes"
- **THEN** el hábito queda creado con ese recordatorio

#### Scenario: Un hábito sin hora explica contra qué se calcula

- **WHEN** se abre el selector de recordatorios de un hábito "todo el día" y la hora de
  referencia del usuario es 09:00
- **THEN** las opciones SHALL nombrar esa hora de referencia en vez de un genérico "antes"

#### Scenario: Eliminar el hábito se lleva sus recordatorios

- **WHEN** se elimina un hábito que tenía dos recordatorios y avisos ya entregados
- **THEN** los recordatorios y las entregas se borran en cascada junto con él

