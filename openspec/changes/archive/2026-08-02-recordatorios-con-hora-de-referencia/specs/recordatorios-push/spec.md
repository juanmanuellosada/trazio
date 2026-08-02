## MODIFIED Requirements

### Requirement: Recordatorios puntuales y relativos a la tarea

Una tarea SHALL poder tener varios recordatorios. Cada recordatorio SHALL
configurarse como un momento puntual (fecha y hora concretas) o como un
momento relativo a la tarea: a la hora de la tarea, 10, 30 o 45 minutos
antes, 1, 2 o 3 horas antes, o 1, 2 o 3 días antes, o una semana antes.

Las opciones relativas ofrecidas SHALL depender de lo que la tarea tenga:

- Con fecha y hora, SHALL ofrecerse todas, incluida "a la hora de la tarea".
- Con solo fecha, SHALL ofrecerse las de desfase, calculadas desde la **hora de
  referencia** configurada por el usuario. "A la hora de la tarea" NUNCA SHALL ofrecerse
  en este caso: la tarea no tiene hora, y anunciarla como tal sería falso.
- Sin ninguna fecha, NUNCA SHALL ofrecerse una opción relativa; solo puntuales.

El instante de un recordatorio relativo sobre una tarea con solo fecha SHALL resolverse
combinando esa fecha, la hora de referencia y la zona horaria del usuario.

#### Scenario: Una tarea puede tener varios recordatorios

- **WHEN** se agregan dos recordatorios distintos a la misma tarea
- **THEN** ambos quedan asociados a esa tarea, cada uno con su propio
  `remind_at`

#### Scenario: Crear un recordatorio puntual

- **WHEN** se agrega a una tarea un recordatorio con fecha y hora concretas
- **THEN** el recordatorio queda creado con ese `remind_at` exacto

#### Scenario: Un relativo sobre una tarea con solo fecha usa la hora de referencia

- **WHEN** se agrega "un día antes" a una tarea que vence un día determinado, sin hora
- **THEN** el recordatorio SHALL quedar agendado un día antes de ese día, a la hora de
  referencia del usuario, resuelta en su zona horaria

#### Scenario: "A la hora de la tarea" no se ofrece sin hora

- **WHEN** se abre el selector de recordatorios sobre una tarea que tiene fecha pero no
  hora
- **THEN** SHALL ofrecerse las opciones de desfase
- **AND** NUNCA SHALL ofrecerse "a la hora de la tarea"

#### Scenario: Una tarea sin ninguna fecha solo admite puntuales

- **WHEN** se abre el selector de recordatorios sobre una tarea sin fecha
- **THEN** NUNCA SHALL ofrecerse ninguna opción relativa
- **AND** SHALL poder agregarse un recordatorio puntual

### Requirement: Recálculo de recordatorios relativos ante cambios de fecha u hora

Los recordatorios relativos aún no entregados SHALL recalcularse cuando cambia la hora de
vencimiento de su tarea. SHALL recalcularse también cuando cambia el **día** de
vencimiento de una tarea que no tiene hora, contra la hora de referencia.

Quitarle la hora a una tarea que conserva su día NUNCA SHALL borrar sus recordatorios
relativos: SHALL recalcularlos contra la hora de referencia. Solo cuando la tarea queda
**sin ninguna fecha** SHALL eliminarse sus recordatorios relativos pendientes, porque
dejan de tener referencia.

Los recordatorios ya entregados NUNCA SHALL recalcularse, y los puntuales NUNCA SHALL
verse afectados por cambios en la tarea.

#### Scenario: Mover la hora de la tarea mueve sus relativos

- **WHEN** una tarea con hora y un recordatorio "30 minutos antes" cambia de hora
- **THEN** ese recordatorio SHALL quedar 30 minutos antes de la hora nueva

#### Scenario: Mover el día de una tarea sin hora mueve sus relativos

- **WHEN** una tarea con solo fecha y un recordatorio "un día antes" cambia de día
- **THEN** ese recordatorio SHALL quedar un día antes del día nuevo, a la hora de
  referencia

#### Scenario: Quitarle la hora a una tarea no borra sus recordatorios

- **WHEN** una tarea con hora y recordatorios relativos pendientes pasa a tener solo
  fecha
- **THEN** esos recordatorios NUNCA SHALL borrarse
- **AND** SHALL recalcularse contra la hora de referencia

#### Scenario: Quitarle toda la fecha sí los elimina

- **WHEN** una tarea con recordatorios relativos pendientes queda sin ninguna fecha
- **THEN** esos recordatorios SHALL eliminarse, porque quedan sin referencia

#### Scenario: Los puntuales y los ya entregados no se tocan

- **WHEN** una tarea con un recordatorio puntual y otro ya entregado cambia de fecha
- **THEN** ninguno de los dos SHALL modificarse
