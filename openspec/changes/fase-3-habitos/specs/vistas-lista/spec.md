## MODIFIED Requirements

### Requirement: Vista Hoy

La vista Hoy SHALL mostrar sus bloques en este orden: primero las tareas atrasadas destacadas visualmente, después las tareas que vencen hoy, después el bloque de hábitos del día con un contador de cuántos se marcaron, y por último, solo si el usuario activa esa opción, las tareas completadas del día. Los eventos de calendario que menciona `docs/product-spec.md` para esta vista pertenecen a la fase 4 y todavía no aparecen. El botón de agregar tarea de esta vista SHALL precargar la fecha de hoy.

#### Scenario: Orden de bloques en Hoy

- **WHEN** el usuario abre la vista Hoy y tiene tareas atrasadas, tareas que vencen hoy y hábitos programados para hoy
- **THEN** la vista muestra primero el bloque de tareas atrasadas, destacado visualmente
- **AND** a continuación muestra el bloque de tareas que vencen hoy
- **AND** a continuación muestra el bloque de hábitos del día, con un contador de cuántos se marcaron
- **AND** si el usuario activa la opción de ver completadas, el bloque de tareas completadas del día aparece al final

#### Scenario: Hoy incluye el bloque de hábitos del día, pero no eventos de calendario

- **WHEN** el usuario abre la vista Hoy en esta fase
- **THEN** la vista muestra el bloque de hábitos del día cuando el usuario tiene al menos un hábito programado para hoy
- **AND** la vista no muestra ningún bloque de eventos de calendario

#### Scenario: Alta rápida desde Hoy precarga la fecha

- **WHEN** el usuario abre el formulario de agregar tarea desde la vista Hoy
- **THEN** el campo de fecha de vencimiento llega precargado con la fecha de hoy

### Requirement: Contador de pendientes de Hoy solo cuenta tareas

El contador que acompaña el acceso a Hoy en la navegación SHALL contar tareas pendientes atrasadas o que vencen hoy, más los hábitos pendientes de hoy —los que tocan hoy y todavía no fueron marcados—, sumando ambos en un solo número.

#### Scenario: El contador suma tareas y hábitos pendientes de hoy

- **WHEN** el panel lateral o la barra inferior muestran el contador junto al acceso a Hoy
- **THEN** el número mostrado es la suma de las tareas pendientes atrasadas o que vencen hoy, más los hábitos que tocan hoy y todavía no fueron marcados
