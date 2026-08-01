# vista-calendario Specification

## Purpose
TBD - created by archiving change fase-4-calendario. Update Purpose after archive.
## Requirements
### Requirement: Cuatro formatos siempre disponibles, con el layout adaptado por ancho

La vista de calendario SHALL ofrecer siempre los cuatro formatos día, cuatro días, semana y mes, sin restringir ninguno de ellos según el tipo de dispositivo, y el layout de cada formato SHALL adaptarse al ancho disponible en lugar de ocultar formatos en pantallas angostas.

#### Scenario: Los cuatro formatos están disponibles en un teléfono

- **WHEN** se abre el selector de formato de calendario en una pantalla de
  ancho angosto, propio de un teléfono
- **THEN** los cuatro formatos —día, cuatro días, semana y mes— aparecen
  disponibles para elegir

#### Scenario: El layout se adapta al ancho sin ocultar formatos

- **WHEN** se elige el formato semana en una pantalla angosta
- **THEN** la grilla de la semana se redibuja para caber en ese ancho, sin que
  el formato deje de estar disponible

### Requirement: Grilla de 24 horas, fila de todo el día y línea de la hora actual

Los formatos día, cuatro días y semana SHALL mostrar una grilla con las 24 horas del día, SHALL mostrar una fila separada en la parte superior para los eventos, tareas y hábitos de todo el día, y SHALL dibujar una línea horizontal que marca la hora actual sobre la grilla.

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

- **WHEN** se mira la grilla en un momento dado del día
- **THEN** una línea horizontal marca la posición correspondiente a la hora
  actual dentro de la grilla

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

