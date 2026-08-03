## MODIFIED Requirements

### Requirement: Vista Hoy

La vista Hoy SHALL mostrar sus bloques en este orden: primero las tareas atrasadas destacadas visualmente, después **una sola secuencia con las tareas que vencen hoy y los eventos de calendario de hoy intercalados**, después el bloque de hábitos del día con un contador de cuántos se marcaron, y por último, solo si el usuario activa esa opción, las tareas completadas del día. El botón de agregar tarea de esta vista SHALL precargar la fecha de hoy.

Los eventos de calendario NUNCA SHALL mostrarse en un bloque propio al final: el orden dentro de la secuencia y el tratamiento de cada fila los define la capacidad `hoy-con-eventos`.

#### Scenario: Orden de bloques en Hoy

- **WHEN** el usuario abre la vista Hoy y tiene tareas atrasadas, tareas que vencen hoy, hábitos programados para hoy y eventos de calendario de hoy
- **THEN** la vista muestra primero el bloque de tareas atrasadas, destacado visualmente
- **AND** a continuación muestra una sola secuencia con las tareas que vencen hoy y los eventos de hoy intercalados
- **AND** a continuación muestra el bloque de hábitos del día, con un contador de cuántos se marcaron
- **AND** si el usuario activa la opción de ver completadas, el bloque de tareas completadas del día aparece al final

#### Scenario: Los eventos de hoy no tienen bloque propio

- **WHEN** el usuario abre la vista Hoy y tiene al menos un evento de calendario para hoy
- **THEN** los eventos SHALL aparecer dentro de la secuencia de tareas de hoy
- **AND** NUNCA SHALL aparecer un bloque de eventos separado al final de la vista

#### Scenario: Alta rápida desde Hoy precarga la fecha

- **WHEN** el usuario abre el formulario de agregar tarea desde la vista Hoy
- **THEN** el campo de fecha de vencimiento llega precargado con la fecha de hoy

### Requirement: Contador de pendientes de Hoy solo cuenta tareas

El contador que acompaña el acceso a Hoy en la navegación SHALL contar tareas pendientes atrasadas o que vencen hoy, más los hábitos pendientes de hoy —los que tocan hoy y todavía no fueron marcados—, sumando ambos en un solo número.

NUNCA SHALL contar eventos de calendario, aunque la vista Hoy los muestre. Un evento no se completa, así que un contador que los incluyera nunca bajaría a cero en un día con reuniones.

#### Scenario: El contador suma tareas y hábitos pendientes de hoy

- **WHEN** el panel lateral o la barra inferior muestran el contador junto al acceso a Hoy
- **THEN** el número mostrado es la suma de las tareas pendientes atrasadas o que vencen hoy, más los hábitos que tocan hoy y todavía no fueron marcados

#### Scenario: Un evento no incrementa el contador

- **WHEN** el usuario tiene un evento hoy y ninguna tarea ni hábito pendiente
- **THEN** el contador de Hoy NUNCA SHALL contar ese evento

### Requirement: Selección múltiple en Bandeja de entrada, Hoy y Proyecto

Bandeja de entrada, Hoy y Proyecto SHALL ofrecer selección múltiple de
tareas, con la barra de acciones en lote que define la capacidad
`seleccion-multiple`. Completado NUNCA SHALL ofrecer selección múltiple en
esta fase.

Los eventos de calendario NUNCA SHALL entrar en la selección múltiple de Hoy: las acciones en lote son de tarea, y ninguna se aplica a un evento.

#### Scenario: Selección múltiple disponible en Bandeja de entrada, Hoy y Proyecto

- **WHEN** un usuario activa selección múltiple en Bandeja de entrada, Hoy o Proyecto
- **THEN** puede marcar más de una tarea a la vez
- **AND** aparece la barra de acciones en lote

#### Scenario: Completado no ofrece selección múltiple

- **WHEN** un usuario abre Completado
- **THEN** no existe ningún casillero de selección múltiple en esa vista

#### Scenario: Un evento no se puede seleccionar

- **WHEN** un usuario activa selección múltiple en Hoy y la lista tiene eventos
- **THEN** NUNCA SHALL verse un casillero de selección en la fila de un evento
