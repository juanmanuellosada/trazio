## MODIFIED Requirements

### Requirement: Badge del ícono con los pendientes del día

El ícono de la aplicación SHALL mostrar un badge con la cantidad de pendientes del día, sumando las tareas sin completar que vencen hoy o están atrasadas y los hábitos pendientes de hoy —los que tocan hoy y todavía no fueron marcados—. Es el mismo conjunto que cuenta el contador de Hoy del panel lateral, y los dos números NUNCA SHALL diferir.

El badge NUNCA SHALL contar recordatorios: un recordatorio es un aviso sobre una tarea que ya entra en el conteo, y sumarlo contaría dos veces lo mismo.

Con cero pendientes, NUNCA SHALL mostrarse un badge.

Este requisito reemplaza al anterior, que sumaba los recordatorios de hoy aún no entregados en lugar de las tareas.

#### Scenario: El badge suma tareas y hábitos pendientes de hoy

- **WHEN** la persona usuaria tiene tres tareas sin completar que vencen hoy y dos hábitos que tocan hoy sin marcar
- **THEN** el badge del ícono de la aplicación muestra el número 5

#### Scenario: Las tareas atrasadas entran en el badge

- **WHEN** la persona usuaria tiene dos tareas atrasadas y una que vence hoy, sin hábitos
- **THEN** el badge muestra el número 3

#### Scenario: Los recordatorios no inflan el badge

- **WHEN** la persona usuaria tiene una única tarea pendiente para hoy y tres recordatorios programados para hoy sobre esa misma tarea
- **THEN** el badge muestra el número 1

#### Scenario: El badge coincide con el contador del panel lateral

- **WHEN** se compara el número del badge con el del contador de Hoy del panel lateral
- **THEN** SHALL ser el mismo número

#### Scenario: Sin pendientes no hay badge

- **WHEN** no queda ninguna tarea ni hábito pendiente de hoy
- **THEN** NUNCA SHALL mostrarse un badge en el ícono

## ADDED Requirements

### Requirement: El título del documento lleva la cantidad de pendientes

El título del documento SHALL anteponer la cantidad de pendientes del día entre paréntesis cuando hay al menos uno: `(8) Trazio`. Con cero pendientes, el título NUNCA SHALL llevar número.

El número del título SHALL ser el mismo que el del badge.

El título SHALL mantener el número al navegar entre pantallas de la aplicación: NUNCA SHALL perderse cuando la ruta cambia el título.

Este requisito existe porque el badge del ícono NUNCA se dibuja en algunas plataformas —entre ellas Linux, donde la API está disponible pero el sistema no lo pinta—, y el título es la única superficie del mismo número que funciona en todas.

#### Scenario: El título muestra los pendientes

- **WHEN** la persona usuaria tiene ocho pendientes del día
- **THEN** el título del documento SHALL empezar con `(8)`

#### Scenario: Sin pendientes el título no lleva número

- **WHEN** no queda ningún pendiente del día
- **THEN** el título del documento NUNCA SHALL llevar un número entre paréntesis

#### Scenario: Navegar entre pantallas conserva el número

- **WHEN** se navega de Hoy a Próximos y a un proyecto
- **THEN** el título SHALL seguir mostrando la cantidad de pendientes en las tres pantallas

#### Scenario: El número del título coincide con el del badge

- **WHEN** el badge del ícono muestra 5
- **THEN** el título del documento SHALL empezar con `(5)`
