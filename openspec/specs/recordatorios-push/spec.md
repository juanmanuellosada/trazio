# recordatorios-push Specification

## Purpose
TBD - created by archiving change fase-2-potencia. Update Purpose after archive.
## Requirements
### Requirement: Activación de recordatorios push desde Configuración

Los recordatorios push SHALL activarse desde Configuración. Al activarlos, el
navegador SHALL pedir permiso de notificaciones. Los recordatorios SHALL poder
activarse en varios dispositivos a la vez, con una suscripción propia por
dispositivo.

#### Scenario: Activar recordatorios pide permiso al navegador

- **WHEN** se activan los recordatorios push desde Configuración
- **THEN** el navegador solicita permiso de notificaciones

#### Scenario: Activar en varios dispositivos crea una suscripción por cada uno

- **WHEN** se activan los recordatorios push desde el mismo usuario en dos
  dispositivos distintos
- **THEN** quedan dos filas en `push_subscriptions`, una por dispositivo,
  cada una con su propio `endpoint`

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

### Requirement: Entrega de la notificación push

Al llegar el momento de un recordatorio, SHALL enviarse una notificación push
con el título de la tarea, como texto plano (D2). Al tocar la notificación,
SHALL abrirse esa tarea.

#### Scenario: La notificación muestra el título de la tarea y abre la tarea al tocarla

- **WHEN** llega el momento (`remind_at`) de un recordatorio de la tarea
  "Pagar el alquiler"
- **THEN** se envía una notificación push cuyo contenido es el título "Pagar
  el alquiler" como texto plano
- **AND** tocar esa notificación abre el detalle de esa tarea

### Requirement: Entrega única, sin reintento

Cada recordatorio SHALL entregarse como máximo una vez. Si no llegó a
tiempo, NUNCA SHALL reintentarse. El mecanismo es reclamar-antes-de-enviar: el
cron marca `delivered_at` en la misma sentencia que selecciona los
recordatorios a enviar, antes de intentar el envío.

#### Scenario: Dos ejecuciones solapadas del cron no producen una notificación duplicada

- **WHEN** dos ejecuciones del cron de recordatorios se solapan y ambas
  intentan procesar el mismo recordatorio vencido
- **THEN** solo una de las dos ejecuciones logra reclamarlo y enviarlo
- **AND** se envía como máximo una notificación para ese recordatorio

#### Scenario: Un envío fallido no se reintenta

- **WHEN** el envío de la notificación de un recordatorio ya reclamado
  (`delivered_at` marcado) falla
- **THEN** ese recordatorio no se vuelve a intentar en ninguna ejecución
  posterior del cron

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

### Requirement: Suscripciones inválidas se eliminan

Una suscripción de push cuyo envío devuelve un estado `404` o `410` SHALL
eliminarse.

#### Scenario: Un envío que devuelve 404 elimina la suscripción

- **WHEN** el envío de una notificación a una suscripción devuelve estado 404
- **THEN** esa suscripción se elimina de `push_subscriptions`

#### Scenario: Un envío que devuelve 410 elimina la suscripción

- **WHEN** el envío de una notificación a una suscripción devuelve estado 410
- **THEN** esa suscripción se elimina de `push_subscriptions`

### Requirement: Badge del ícono con los pendientes del día

El ícono de la aplicación SHALL mostrar un badge con la cantidad de pendientes del día, sumando los recordatorios de hoy aún no entregados y los hábitos pendientes de hoy —los que tocan hoy y todavía no fueron marcados—; el spec funcional pidió esta suma desde el inicio, y esta fase corrige que el badge, desde la fase 2, contaba solo recordatorios.

#### Scenario: El badge suma recordatorios y hábitos pendientes de hoy

- **WHEN** la persona usuaria tiene tres recordatorios programados para hoy aún no entregados y dos hábitos que tocan hoy sin marcar
- **THEN** el badge del ícono de la aplicación muestra el número 5

### Requirement: Sin recordatorios por email

NUNCA SHALL existir una opción para configurar un recordatorio por email.

#### Scenario: No hay opción de recordatorio por email

- **WHEN** se abre el control para agregar un recordatorio a una tarea
- **THEN** ninguna opción disponible corresponde a un envío por email

