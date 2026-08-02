## REMOVED Requirements

### Requirement: El ancla de la recurrencia se deriva del tipo de regla

**Reason**: El título afirma lo contrario de lo que pasa a regir. El ancla dejaba de ser
una consecuencia automática de la forma de la regla y pasa a poder elegirse, así que un
requisito llamado "se deriva del tipo de regla" quedaría contradiciendo a su propio cuerpo.

El acoplamiento que ese requisito describía era real y era el problema: no se podía pedir
"cada 3 días desde el vencimiento" ni "cada lunes desde el completado", porque el ancla
venía impuesta por la forma de la regla.

**Migration**: Lo reemplaza "El ancla de la recurrencia se elige, y si no se deriva", que
conserva la derivación entera como comportamiento por defecto. **No hay datos que migrar y
ninguna tarea existente cambia de comportamiento**: la columna nueva queda vacía, y vacía
significa derivar exactamente como antes.

## ADDED Requirements

### Requirement: El ancla de la recurrencia se elige, y si no se deriva

El ancla de una tarea recurrente SHALL poder elegirse explícitamente entre la fecha de
vencimiento y la fecha de completado. Cuando el usuario **no** eligió ninguna, el sistema
SHALL derivarla del tipo de regla, como hasta ahora: una regla anclada al calendario (que use
`BYDAY`, `BYMONTHDAY` o `BYMONTH` — por ejemplo "cada lunes", "cada día laborable" o "cada
mes") calcula desde la fecha de vencimiento original de la tarea completada, y una regla de
intervalo puro (por ejemplo `FREQ=DAILY;INTERVAL=3`, sin ningún componente `BY*`) calcula
desde la fecha de completado.

Una elección explícita SHALL ganar sobre la derivación, cualquiera sea la forma de la regla.
Las tareas que ya existían y nunca eligieron NUNCA SHALL cambiar de comportamiento.

#### Scenario: Sin elección, una regla anclada al calendario calcula desde el vencimiento

- **WHEN** se completa una tarea sin ancla elegida, con regla "cada lunes" cuya fecha de
  vencimiento era un lunes, y se completa un miércoles de esa misma semana
- **THEN** la siguiente instancia se agenda para el lunes siguiente al
  vencimiento original, no para el lunes contado desde el miércoles de
  completado

#### Scenario: Sin elección, una regla de intervalo puro calcula desde el completado

- **WHEN** se completa una tarea sin ancla elegida, con regla "cada 3 días"
  (`FREQ=DAILY;INTERVAL=3`) el día 10, habiendo vencido originalmente el día 8
- **THEN** la siguiente instancia se agenda para el día 13, tres días después
  del completado, no tres días después del vencimiento original

#### Scenario: Elegir el vencimiento sobre una regla de intervalo puro

- **WHEN** una tarea con regla "cada 3 días" tiene elegido el vencimiento como ancla, vence
  el día 8 y se completa el día 10
- **THEN** la siguiente instancia SHALL agendarse para el día 11, tres días después del
  vencimiento
- **AND** la derivación por forma de regla NUNCA SHALL imponerse sobre esa elección

#### Scenario: Elegir el completado sobre una regla anclada al calendario

- **WHEN** una tarea con regla "cada lunes" tiene elegido el completado como ancla
- **THEN** la siguiente instancia SHALL calcularse desde la fecha de completado

#### Scenario: Las tareas que ya existían no cambian

- **WHEN** se completa una tarea recurrente creada antes de que existiera la elección de
  ancla
- **THEN** SHALL comportarse exactamente como antes, derivando el ancla de su regla

### Requirement: El editor de repetición ofrece opciones derivadas de la tarea

El editor de repetición SHALL ofrecer opciones rápidas cuyos textos y reglas se deriven de la
**fecha de la tarea**: cada día, cada semana el día que corresponda, cada día laborable, cada
mes el número que corresponda, y cada año la fecha que corresponda. SHALL ofrecer además una
opción personalizada.

Cuando la tarea no tiene fecha, las opciones que dependen de ella NUNCA SHALL ofrecerse: no se
ofrece una opción que afirma algo que la tarea no tiene.

El editor SHALL generar la regla **completa**, incluidos los componentes de calendario, y
NUNCA SHALL descartar partes de una regla existente al cambiar otra: cambiar la frecuencia de
una tarea cuya regla ya nombraba días NUNCA SHALL borrar esos días en silencio.

#### Scenario: Las opciones nombran la fecha de la tarea

- **WHEN** se abre el editor de repetición de una tarea que vence el 5 de abril, un domingo
- **THEN** SHALL ofrecerse "cada semana" referida al domingo, "cada mes" referida al día 5 y
  "cada año" referida al 5 de abril

#### Scenario: Una tarea sin fecha no ofrece las opciones derivadas

- **WHEN** se abre el editor de repetición de una tarea sin fecha
- **THEN** NUNCA SHALL ofrecerse las opciones que dependen de la fecha de la tarea

#### Scenario: Cambiar la frecuencia no destruye el resto de la regla

- **WHEN** una tarea tiene una regla que nombra días de la semana y se cambia otra parte de la
  repetición desde el editor
- **THEN** los días nombrados SHALL conservarse

#### Scenario: La opción personalizada abre su propio diálogo

- **WHEN** se elige la opción personalizada
- **THEN** SHALL abrirse un diálogo que permita elegir desde qué fecha se cuenta, cada cuántas
  unidades se repite, en qué días, y cuándo termina
