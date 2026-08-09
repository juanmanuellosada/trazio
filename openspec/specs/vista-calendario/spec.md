# vista-calendario Specification

## Purpose
TBD - created by archiving change fase-4-calendario. Update Purpose after archive.
## Requirements
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

### Requirement: Grilla de 24 horas, fila de todo el día y línea de la hora actual

Los formatos día, cuatro días y semana SHALL mostrar una grilla con las 24 horas del día, SHALL mostrar una fila separada en la parte superior para los eventos, tareas y hábitos de todo el día, y SHALL dibujar una línea horizontal que marca la hora actual sobre la grilla.

Esa línea SHALL avanzar sola mientras la pantalla está abierta, y NUNCA SHALL quedar fija en la hora en que se cargó la página: una línea detenida indica una hora falsa, que es peor que no indicar ninguna.

La línea SHALL dibujarse en **rojo**, distinto de cualquier color que pueda tener un bloque, para que se lea como una marca del reloj y no como un elemento más de la agenda.

#### Scenario: La grilla cubre las 24 horas

- **WHEN** se abre el formato día
- **THEN** la grilla muestra las 24 horas, desde las 00:00 hasta las 23:59

#### Scenario: Los eventos de todo el día van en una fila separada

- **WHEN** hay un evento de todo el día y otro con horario puntual el mismo
  día
- **THEN** el evento de todo el día aparece en la fila superior separada de la
  grilla horaria, y el evento con horario aparece dentro de la grilla en su
  horario

#### Scenario: La línea de la hora actual se mueve con el tiempo

- **WHEN** el usuario deja la grilla abierta y pasa el tiempo
- **THEN** la línea SHALL bajar acompañando la hora actual
- **AND** NUNCA SHALL quedar en la posición que tenía al cargar la página

#### Scenario: La línea se distingue de los bloques

- **WHEN** el usuario mira la grilla del día de hoy
- **THEN** la línea de la hora actual SHALL verse en rojo

### Requirement: Tareas, hábitos y eventos se dibujan juntos y se distinguen por forma

La grilla SHALL dibujar juntos los bloques de tareas, hábitos y eventos del rango visible, y los tres tipos SHALL distinguirse entre sí por la forma del bloque y no únicamente por el color, porque el color ya está tomado por el proyecto o la etiqueta de la tarea, o por el calendario de origen del evento.

#### Scenario: Los tres tipos conviven en la misma grilla

- **WHEN** en el mismo día hay una tarea con horario, un hábito programado y
  un evento de Google
- **THEN** los tres bloques aparecen dibujados en la grilla, en sus horarios
  correspondientes

#### Scenario: Se distinguen sin depender solo del color

- **WHEN** una tarea y un evento tienen el mismo color porque coinciden el
  color del proyecto y el color del calendario de origen
- **THEN** igual se puede distinguir cuál es la tarea y cuál es el evento por
  la forma del bloque, sin depender del color

### Requirement: El formato elegido se recuerda por pantalla

El formato de calendario elegido —día, cuatro días, semana o mes— SHALL guardarse en `view_preferences` por separado para cada pantalla donde la vista de calendario está disponible, igual que el resto de las opciones de vista.

#### Scenario: Cambiar el formato en Próximos no afecta el de Proyecto

- **WHEN** se elige el formato mes en Próximos y el formato semana en un
  Proyecto
- **THEN** al volver a cada pantalla, cada una conserva su propio formato
  elegido

### Requirement: Vista previa de repeticiones futuras de una tarea recurrente

Trazio SHALL ofrecer una opción para mostrar las repeticiones futuras de una tarea recurrente como bloques de vista previa en la grilla, acotados al rango de fechas visible, y esos bloques de vista previa NUNCA SHALL responder a ninguna interacción: ni arrastre, ni clic que abra el detalle, ni ningún otro gesto.

#### Scenario: Las repeticiones futuras se muestran acotadas al rango visible

- **WHEN** se activa la opción de mostrar repeticiones futuras para una tarea
  que se repite todas las semanas, en un formato mes
- **THEN** se ven bloques de vista previa en cada semana del mes visible en la
  que la tarea va a repetirse
- **AND** no aparece ningún bloque de vista previa fuera del rango visible

#### Scenario: Los bloques de vista previa no son interactivos

- **WHEN** se intenta arrastrar o hacer clic sobre un bloque de vista previa
  de una repetición futura
- **THEN** no ocurre ningún cambio ni se abre ningún detalle, porque el bloque
  representa algo que todavía no existe

### Requirement: Cada bloque muestra lo que entra en su alto

El contenido de un bloque SHALL depender del alto que ese bloque tiene, y NUNCA SHALL ser el mismo en un bloque de quince minutos que en uno de varias horas.

Un bloque de evento SHALL mostrar, en este orden y hasta donde entre: el título, su horario, y el nombre de su calendario.

Un bloque de tarea o de hábito SHALL mostrar, en este orden y hasta donde entre: el título, su horario, su proyecto y sus etiquetas.

El control para completar una tarea o un hábito NUNCA SHALL caerse por falta de espacio: es una acción y no información, y sin él la única forma de completar desde el calendario sería abrir otra pantalla.

Un bloque de hábito SHALL mostrar además una marca que lo identifique como hábito.

#### Scenario: Un bloque corto muestra solo lo esencial

- **WHEN** se muestra un evento de quince minutos
- **THEN** SHALL mostrarse su título
- **AND** NUNCA SHALL mostrarse texto recortado a la mitad de una línea

#### Scenario: Un bloque largo muestra todo

- **WHEN** se muestra una tarea de dos horas que tiene proyecto y etiquetas
- **THEN** SHALL mostrarse su título, su horario, su proyecto y sus etiquetas

#### Scenario: El control de completar siempre está

- **WHEN** se muestra una tarea de quince minutos
- **THEN** SHALL mostrarse igual su control de completar

#### Scenario: Un hábito se reconoce como tal

- **WHEN** se muestra un hábito en la grilla
- **THEN** SHALL verse una marca que lo identifica como hábito

### Requirement: Un evento se dibuja con el color de su calendario

Un bloque de evento SHALL dibujarse con el color del calendario del que proviene.

Cuando Google no informa ese color, SHALL usarse un color de reemplazo, y ese reemplazo SHALL ser **el mismo** en todas las superficies que muestran eventos.

El color SHALL resultar legible en el tema claro y en el oscuro.

Esto NUNCA SHALL debilitar la distinción por forma entre tarea, hábito y evento: dos bloques del mismo color SHALL seguir distinguiéndose por su forma.

#### Scenario: Dos calendarios distintos se ven distintos

- **WHEN** el usuario tiene eventos de dos calendarios con colores distintos
- **THEN** cada bloque SHALL llevar el color de su calendario

#### Scenario: Sin color informado hay uno de reemplazo consistente

- **WHEN** Google no informa el color de un calendario
- **THEN** SHALL usarse un color de reemplazo
- **AND** SHALL ser el mismo que usan las demás superficies que muestran eventos

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

### Requirement: Mover y redimensionar se ven al instante

Al soltar un bloque, SHALL quedar en su nueva posición de inmediato, sin esperar la respuesta del servidor. Si el servidor rechaza el cambio, SHALL volver a su lugar y SHALL avisarse.

Eso SHALL valer para las tres pantallas que muestran el calendario y para los tres tipos de bloque, y NUNCA SHALL depender de que llegue una actualización en tiempo real.

Cuando el bloque es una ocurrencia de una serie y hace falta preguntar el alcance, el bloque SHALL quedar donde se lo soltó mientras se pregunta, y NUNCA SHALL volver al origen antes de que el usuario responda. Si cancela, SHALL volver.

#### Scenario: El bloque se queda donde se lo soltó

- **WHEN** el usuario mueve un bloque y suelta
- **THEN** SHALL quedar en la posición nueva de inmediato

#### Scenario: Un rechazo devuelve el bloque

- **WHEN** el servidor rechaza el cambio
- **THEN** el bloque SHALL volver a su posición anterior
- **AND** SHALL avisarse del motivo

#### Scenario: Preguntar por la serie no mueve el bloque

- **WHEN** el usuario suelta una ocurrencia de una serie y se le pregunta el alcance
- **THEN** el bloque SHALL quedar donde lo soltó mientras responde
- **AND** si cancela, SHALL volver a su posición anterior

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

### Requirement: Un bloque de hábito completado responde al control de completadas

En la forma de ver calendario, un hábito ya marcado ese día NUNCA SHALL dibujarse cuando el control de mostrar completadas está apagado, con el mismo criterio que una tarea completada.

Un hábito **salteado** SHALL seguir dibujándose, marcado como salteado, con el control apagado: la decisión de D50 —que un hábito salteado se ve y no desaparece de la grilla— NUNCA SHALL alterarse por este control.

#### Scenario: Un hábito completado desaparece de la grilla

- **WHEN** el control de mostrar completadas está apagado y un hábito de ese día ya está marcado
- **THEN** su bloque NUNCA SHALL dibujarse en la grilla

#### Scenario: Marcar un hábito con las completadas apagadas lo saca de la grilla

- **WHEN** con el control apagado se marca un hábito desde su bloque del calendario
- **THEN** ese bloque SHALL dejar de dibujarse

#### Scenario: Un hábito salteado sigue en la grilla

- **WHEN** el control de mostrar completadas está apagado y un hábito de ese día está salteado
- **THEN** su bloque SHALL seguir dibujándose, con su marca de salteado

