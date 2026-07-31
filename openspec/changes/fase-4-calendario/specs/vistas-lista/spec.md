## MODIFIED Requirements

### Requirement: Vista Hoy

La vista Hoy SHALL mostrar sus bloques en este orden: primero las tareas atrasadas destacadas visualmente, después las tareas que vencen hoy, después el bloque de hábitos del día con un contador de cuántos se marcaron, después el bloque de eventos de calendario de hoy, y por último, solo si el usuario activa esa opción, las tareas completadas del día. El botón de agregar tarea de esta vista SHALL precargar la fecha de hoy.

#### Scenario: Orden de bloques en Hoy

- **WHEN** el usuario abre la vista Hoy y tiene tareas atrasadas, tareas que vencen hoy, hábitos programados para hoy y eventos de calendario de hoy
- **THEN** la vista muestra primero el bloque de tareas atrasadas, destacado visualmente
- **AND** a continuación muestra el bloque de tareas que vencen hoy
- **AND** a continuación muestra el bloque de hábitos del día, con un contador de cuántos se marcaron
- **AND** a continuación muestra el bloque de eventos de calendario de hoy
- **AND** si el usuario activa la opción de ver completadas, el bloque de tareas completadas del día aparece al final

#### Scenario: Hoy incluye el bloque de eventos de calendario del día

- **WHEN** el usuario abre la vista Hoy y tiene al menos un evento de calendario para hoy
- **THEN** la vista muestra el bloque de eventos de calendario de hoy
- **AND** si no tiene eventos para hoy, ese bloque no aparece

#### Scenario: Alta rápida desde Hoy precarga la fecha

- **WHEN** el usuario abre el formulario de agregar tarea desde la vista Hoy
- **THEN** el campo de fecha de vencimiento llega precargado con la fecha de hoy
