## ADDED Requirements

### Requirement: Hoy combina tareas y eventos en una sola secuencia

La lista de Hoy SHALL mostrar las tareas del día y los eventos del día **en una sola secuencia**, y NUNCA SHALL mostrarlos en bloques separados.

La secuencia SHALL ordenarse en tres tramos, en este orden: los eventos de todo el día y los que vienen de días anteriores; después todo lo que tiene hora —eventos y tareas juntos— ordenado por hora; y al final las tareas sin hora.

Un evento que empezó antes de hoy SHALL ubicarse en el primer tramo y NUNCA SHALL ubicarse según su hora de inicio, que corresponde a otro día.

Cuando un evento y una tarea coinciden en la hora, el evento SHALL ir primero, de modo que el orden quede total y NUNCA SHALL depender de en qué orden respondieron las dos consultas.

Las horas SHALL compararse como instantes absolutos, NUNCA como textos de hora: los eventos traen zona horaria propia y las tareas usan la del usuario.

#### Scenario: Una tarea temprana precede a un evento posterior

- **WHEN** el usuario tiene un evento a las 8:00 y una tarea a las 6:00
- **THEN** la tarea de las 6:00 SHALL mostrarse antes que el evento de las 8:00

#### Scenario: Los eventos de todo el día encabezan

- **WHEN** el usuario tiene un evento de todo el día y tareas con hora
- **THEN** el evento de todo el día SHALL mostrarse antes que todo lo que tiene hora

#### Scenario: Un evento que viene de ayer no muestra la hora de ayer

- **WHEN** el usuario tiene un evento que empezó ayer y termina hoy
- **THEN** SHALL mostrarse en el primer tramo
- **AND** NUNCA SHALL mostrar la hora de inicio del día anterior

#### Scenario: Las tareas sin hora van al final

- **WHEN** el usuario tiene tareas con hora, eventos y tareas sin hora
- **THEN** las tareas sin hora SHALL mostrarse después de todo lo que tiene hora

### Requirement: Un evento se distingue de una tarea sin leerlo

La fila de un evento SHALL distinguirse de la de una tarea por su forma, y NUNCA SHALL depender de que el usuario lea el texto para saber cuál es cuál.

La fila de un evento NUNCA SHALL mostrar casilla de completar, punto de prioridad, chevron de subtareas, manija de arrastre ni casilla de selección múltiple: un evento no se completa, no se prioriza, no se anida, no se reordena y no entra en las acciones en lote.

La fila de un evento SHALL mostrar el color de su calendario, el título, el rango horario y, si la tiene, la ubicación. SHALL mostrar el nombre de su calendario anclado al borde derecho, en el mismo lugar donde la fila de tarea muestra su proyecto.

#### Scenario: Un evento no ofrece completarse

- **WHEN** el usuario mira un evento en la lista de Hoy
- **THEN** NUNCA SHALL verse una casilla de completar en esa fila

#### Scenario: El calendario de origen se lee en el mismo lugar que el proyecto

- **WHEN** el usuario mira una lista de Hoy con tareas y eventos
- **THEN** el nombre del calendario del evento SHALL estar anclado al borde derecho
- **AND** SHALL quedar alineado con el proyecto de las filas de tarea

### Requirement: Un evento se edita desde la lista, y por más de un camino

Doble clic sobre un evento de la lista SHALL abrir su diálogo de edición, el mismo gesto que abre el detalle de una tarea.

Esa acción SHALL estar disponible además en el menú contextual de la fila y en su botón de acciones: NUNCA SHALL quedar disponible únicamente por el gesto.

El menú de un evento SHALL ofrecer editar, abrir en Google Calendar y eliminar. NUNCA SHALL ofrecer fecha, prioridad, subtareas ni duplicar, que no existen para un evento.

En un ancho de teléfono, donde no hay doble clic, un solo toque SHALL abrir el evento, igual que hace la fila de tarea.

#### Scenario: Doble clic abre la edición

- **WHEN** el usuario hace doble clic sobre un evento de la lista de Hoy
- **THEN** SHALL abrirse el diálogo de edición de ese evento

#### Scenario: La edición también está en el menú

- **WHEN** el usuario abre el menú contextual de un evento
- **THEN** SHALL ver la acción de editar

### Requirement: Un evento de un calendario de solo lectura se abre sin permitir editar

Cuando el evento pertenece a un calendario donde el usuario no puede escribir, el diálogo SHALL abrirse igual pero SHALL impedir editarlo, y SHALL explicar por qué.

NUNCA SHALL ofrecerse un formulario editable que Google va a rechazar al guardar, ni SHALL el gesto quedar sin respuesta.

#### Scenario: Doble clic sobre un evento de solo lectura

- **WHEN** el usuario hace doble clic sobre un evento de un calendario donde no puede escribir
- **THEN** SHALL abrirse el diálogo sin permitir editar
- **AND** SHALL indicarse que ese calendario es de solo lectura

### Requirement: La lista de tareas nunca espera a Google

Las tareas de Hoy SHALL mostrarse sin esperar la respuesta de Google Calendar. NUNCA SHALL existir un estado de carga compartido, ni una espera cruzada, que retrase las tareas por una fuente remota.

Los eventos SHALL insertarse en la secuencia cuando lleguen. NUNCA SHALL reservarse un lugar con un esqueleto de carga: no se sabe de antemano cuántos eventos habrá, y un esqueleto de alto equivocado desplaza el contenido dos veces en vez de una.

Cuando el usuario no tiene Google conectado, Hoy SHALL verse igual que si esta capacidad no existiera: NUNCA SHALL mostrar huecos, avisos ni lugares reservados.

Cuando Google falla, SHALL mostrarse un único aviso al pie de la lista, y NUNCA uno por fila.

#### Scenario: Las tareas se ven mientras los eventos cargan

- **WHEN** el usuario abre Hoy y la respuesta de Google todavía no llegó
- **THEN** las tareas SHALL mostrarse ya ordenadas entre sí

#### Scenario: Sin Google conectado no se nota nada

- **WHEN** un usuario sin Google conectado abre Hoy
- **THEN** NUNCA SHALL ver avisos ni huecos relacionados con eventos

#### Scenario: Con Google caído la lista sigue sirviendo

- **WHEN** el usuario abre Hoy y Google no responde
- **THEN** las tareas SHALL mostrarse igual
- **AND** SHALL mostrarse un solo aviso al pie

### Requirement: El panel de Hoy muestra solo tareas, y lo dice

En la forma de ver "panel", Hoy SHALL mostrar únicamente tareas. Las columnas del panel salen de un criterio de agrupación —prioridad, etiqueta o sección— en el que un evento no puede participar.

Cuando el usuario tiene eventos hoy y la forma de ver activa es "panel", SHALL indicarse que ese formato no los muestra y cómo verlos. NUNCA SHALL omitirse en silencio: sin esa indicación, el usuario concluye que no tiene compromisos.

#### Scenario: El panel no mezcla eventos

- **WHEN** el usuario pone Hoy en forma de ver "panel"
- **THEN** NUNCA SHALL verse un evento entre las tarjetas

#### Scenario: El panel avisa que hay eventos que no muestra

- **WHEN** el usuario tiene eventos hoy y mira Hoy en forma de ver "panel"
- **THEN** SHALL indicarse que este formato no muestra los eventos

### Requirement: El calendario de Hoy es el modo día, sin navegación entre días

En la forma de ver "calendario", Hoy SHALL mostrarse siempre en modo día. El modo SHALL forzarse al dibujar y NUNCA SHALL leerse de lo guardado.

NUNCA SHALL mostrarse la navegación entre días dentro de Hoy: en una vista que es hoy por definición, un control para ir a otro día se contradice con la vista que lo contiene.

#### Scenario: El calendario de Hoy abre en modo día

- **WHEN** el usuario pone Hoy en forma de ver "calendario"
- **THEN** SHALL verse el modo día

#### Scenario: No hay forma de navegar a otro día desde Hoy

- **WHEN** el usuario mira Hoy en forma de ver "calendario"
- **THEN** NUNCA SHALL verse un control para ir al día anterior o siguiente

