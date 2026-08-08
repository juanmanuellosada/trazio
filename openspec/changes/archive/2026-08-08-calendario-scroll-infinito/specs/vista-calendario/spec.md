## MODIFIED Requirements

### Requirement: Cuatro formatos siempre disponibles, con el layout adaptado por ancho

La vista de calendario SHALL ofrecer siempre los cuatro formatos día, cuatro días, semana y mes, sin restringir ninguno de ellos según el tipo de dispositivo, y el layout de cada formato SHALL adaptarse al ancho disponible en lugar de ocultar formatos en pantallas angostas.

En los formatos día, cuatro días y semana, el formato SHALL determinar **únicamente cuántos días se ven a la vez** —uno, cuatro y siete— y NUNCA SHALL fijar en qué día empieza el tramo visible. Esos tres formatos SHALL navegarse con el desplazamiento continuo que define la capacidad `navegacion-continua-calendario`.

El formato mes SHALL ser la excepción: conserva su grilla de semanas y su navegación de mes en mes, y NUNCA SHALL desplazarse de forma continua.

En la forma de ver "calendario", el contenido SHALL ocupar el ancho disponible en vez de detenerse en el tope de la columna de contenido: una grilla de siete columnas no es una línea de texto, y el tope solo achica cada columna. Esta es la misma excepción acotada a **D39** que ya rige para la forma de ver "panel"; la forma de ver "lista" NUNCA SHALL verse afectada.

#### Scenario: Los cuatro formatos están disponibles en un teléfono

- **WHEN** se abre el selector de formato de calendario en una pantalla de
  ancho angosto, propio de un teléfono
- **THEN** los cuatro formatos —día, cuatro días, semana y mes— aparecen
  disponibles para elegir

#### Scenario: El layout se adapta al ancho sin ocultar formatos

- **WHEN** se elige el formato semana en una pantalla angosta
- **THEN** la grilla de la semana se redibuja para caber en ese ancho, sin que
  el formato deje de estar disponible

#### Scenario: En una pantalla ancha la grilla usa el ancho

- **WHEN** el usuario mira el formato semana en una pantalla más ancha que el tope de la columna de contenido
- **THEN** las columnas de día SHALL repartirse ese ancho
- **AND** NUNCA SHALL quedar el calendario detenido en el tope con espacio vacío al costado

#### Scenario: El formato solo dice cuántos días se ven

- **WHEN** el usuario cambia de cuatro días a semana estando desplazado a un tramo que empieza un miércoles
- **THEN** SHALL pasar a ver siete días
- **AND** el tramo SHALL seguir empezando el mismo miércoles

#### Scenario: El mes conserva su navegación

- **WHEN** el usuario elige el formato mes
- **THEN** SHALL ver la grilla de semanas del mes
- **AND** SHALL navegar de mes en mes, sin desplazamiento continuo

#### Scenario: La lista no cambia

- **WHEN** el usuario vuelve a la forma de ver "lista"
- **THEN** el contenido SHALL seguir respetando el tope y el centrado que fija D39

### Requirement: Arrastrar muestra a dónde va antes de soltar

Mientras se arrastra un bloque, SHALL verse a qué horario quedaría, y ese horario SHALL ser el que efectivamente se va a guardar —ajustado a la grilla— y NUNCA la posición libre del puntero.

El lugar de origen SHALL quedar marcado mientras dura el gesto, para que soltar en el lugar equivocado tenga una referencia de dónde estaba.

El bloque arrastrado NUNCA SHALL recortarse ni desaparecer al salir del área de la grilla, y SHALL conservar el ancho y el alto que tenía en la grilla, sin agrandarse ni achicarse al levantarlo.

Soltar un bloque en el mismo lugar del que salió NUNCA SHALL guardar un cambio ni preguntar por el alcance de una serie.

Cuando el gesto llega al borde lateral de la vista, el desplazamiento automático que define la capacidad `navegacion-continua-calendario` SHALL permitir soltar el bloque en un día que no estaba visible al empezar.

#### Scenario: Se ve el horario de destino

- **WHEN** el usuario arrastra un bloque dentro de la grilla
- **THEN** SHALL verse el horario en el que quedaría

#### Scenario: Queda la marca del origen

- **WHEN** el usuario arrastra un bloque
- **THEN** SHALL verse marcado el lugar del que salió

#### Scenario: El bloque no se recorta

- **WHEN** el usuario arrastra un bloque más allá del área visible de la grilla
- **THEN** SHALL seguir visible siguiendo al puntero

#### Scenario: El bloque conserva su tamaño

- **WHEN** el usuario levanta un bloque de quince minutos para arrastrarlo
- **THEN** SHALL verse del mismo ancho y alto que tenía en la grilla

#### Scenario: Soltar donde estaba no cambia nada

- **WHEN** el usuario arrastra un bloque y lo suelta en el mismo horario y el mismo día del que salió
- **THEN** NUNCA SHALL guardarse un cambio
- **AND** si el bloque es una ocurrencia de una serie, NUNCA SHALL preguntarse por el alcance

### Requirement: Cada bloque ofrece sus acciones desde el calendario

Todo bloque SHALL ofrecer un menú contextual con sus acciones, alcanzable con el clic derecho.

Un bloque de evento SHALL ofrecer editarlo, abrirlo en Google Calendar y **eliminarlo**. Eliminar un evento SHALL estar disponible además desde su diálogo de edición, y las dos vías SHALL pedir confirmación.

Un bloque de tarea SHALL ofrecer abrir su detalle, completarla y eliminarla.

Un bloque de hábito SHALL ofrecer editarlo, completarlo y **saltearlo ese día**.

Seleccionar un bloque —con clic, Enter o Espacio— SHALL abrir lo que le corresponde a su tipo, y NUNCA SHALL quedar un bloque que se anuncia accionable sin responder al ser seleccionado.

Un bloque de hábito SHALL poder redimensionarse. Por **D51**, la duración resultante es la del hábito entero y SHALL avisarse que el cambio alcanza a todas sus repeticiones, a diferencia de moverlo, que solo cambia ese día.

Por **D24**, mover y redimensionar NUNCA SHALL ser las únicas formas de cambiar el horario de un bloque.

#### Scenario: Clic derecho sobre un evento

- **WHEN** el usuario hace clic derecho sobre un bloque de evento
- **THEN** SHALL ver las acciones de editar, abrir en Google Calendar y eliminar

#### Scenario: Eliminar un evento pide confirmación

- **WHEN** el usuario elige eliminar un evento
- **THEN** SHALL pedirse confirmación antes de borrarlo

#### Scenario: Eliminar también está en el diálogo de edición

- **WHEN** el usuario abre el diálogo de edición de un evento
- **THEN** SHALL ver la acción de eliminarlo

#### Scenario: Completar una tarea desde su bloque

- **WHEN** el usuario completa una tarea desde su bloque del calendario
- **THEN** la tarea SHALL quedar completada sin abrir otra pantalla

#### Scenario: Seleccionar un hábito abre su edición

- **WHEN** el usuario hace clic sobre un bloque de hábito
- **THEN** SHALL abrirse el diálogo de edición de ese hábito

#### Scenario: Redimensionar un hábito cambia toda la serie

- **WHEN** el usuario estira el borde de un bloque de hábito
- **THEN** la duración del hábito SHALL cambiar para todas sus repeticiones
- **AND** SHALL avisarse que el cambio no es solo de ese día
