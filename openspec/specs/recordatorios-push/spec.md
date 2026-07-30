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
antes, 1, 2 o 3 horas antes, o 1, 2 o 3 días antes, o una semana antes. Un
recordatorio relativo MUST exigir que la tarea tenga fecha y hora (`due_at`);
NUNCA SHALL poder crearse un recordatorio relativo sobre una tarea sin hora.

#### Scenario: Una tarea puede tener varios recordatorios

- **WHEN** se agregan dos recordatorios distintos a la misma tarea
- **THEN** ambos quedan asociados a esa tarea, cada uno con su propio
  `remind_at`

#### Scenario: Crear un recordatorio puntual

- **WHEN** se agrega a una tarea un recordatorio con fecha y hora concretas
- **THEN** el recordatorio queda creado con ese `remind_at` exacto

#### Scenario: Un recordatorio relativo exige que la tarea tenga fecha y hora

- **WHEN** se intenta agregar un recordatorio relativo (por ejemplo "30
  minutos antes") a una tarea que no tiene `due_at`
- **THEN** la operación se rechaza y no se crea ningún recordatorio

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

Los recordatorios relativos SHALL recalcularse cuando cambia la fecha o la
hora de vencimiento de la tarea, siempre que aún no hayan sido entregados
(`delivered_at` nulo). Un recordatorio ya entregado NUNCA SHALL
recalcularse.

#### Scenario: Cambiar la hora de la tarea recalcula el recordatorio relativo pendiente

- **WHEN** se cambia la hora de vencimiento de una tarea que tiene un
  recordatorio relativo de "1 hora antes" aún no entregado
- **THEN** el `remind_at` de ese recordatorio se recalcula en función de la
  nueva hora

#### Scenario: Un recordatorio ya entregado no se recalcula

- **WHEN** se cambia la fecha de vencimiento de una tarea que tiene un
  recordatorio relativo ya entregado (`delivered_at` con valor)
- **THEN** ese recordatorio no se modifica

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

El ícono de la aplicación SHALL mostrar un badge con la cantidad de
pendientes del día.

#### Scenario: El badge muestra la cantidad de pendientes de hoy

- **WHEN** la persona usuaria tiene tres recordatorios programados para hoy
  aún no entregados
- **THEN** el badge del ícono de la aplicación muestra el número 3

### Requirement: Sin recordatorios por email

NUNCA SHALL existir una opción para configurar un recordatorio por email.

#### Scenario: No hay opción de recordatorio por email

- **WHEN** se abre el control para agregar un recordatorio a una tarea
- **THEN** ninguna opción disponible corresponde a un envío por email

