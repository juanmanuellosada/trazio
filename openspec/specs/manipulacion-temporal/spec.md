# manipulacion-temporal Specification

## Purpose
TBD - created by archiving change fase-4-calendario. Update Purpose after archive.
## Requirements
### Requirement: Arrastrar para mover de horario, con ajuste a 15 minutos

En la vista de calendario, arrastrar una tarea, un hábito o un evento a otro punto de la grilla SHALL moverlo a ese nuevo horario, y el horario resultante SHALL ajustarse siempre al intervalo de 15 minutos más cercano.

#### Scenario: Mover una tarea arrastrándola

- **WHEN** se arrastra una tarea programada a las 10:00 hasta la posición de
  la grilla correspondiente a las 14:00
- **THEN** la tarea queda con horario a las 14:00

#### Scenario: El ajuste redondea a 15 minutos

- **WHEN** se suelta un bloque en una posición de la grilla que corresponde
  aproximadamente a las 14:07
- **THEN** el bloque queda ajustado a las 14:00 o a las 14:15, nunca a un
  horario que no sea múltiplo de 15 minutos

### Requirement: Estirar el borde cambia la duración, con el mismo ajuste

Estirar el borde inferior de un bloque en la grilla SHALL cambiar su duración, y la nueva duración resultante SHALL ajustarse al intervalo de 15 minutos más cercano, de la misma forma que el ajuste al mover de horario.

#### Scenario: Estirar un evento para hacerlo más largo

- **WHEN** se estira el borde inferior de un evento de 30 minutos hasta cubrir
  una hora
- **THEN** el evento queda con una duración de 60 minutos

#### Scenario: El ajuste de duración también redondea a 15 minutos

- **WHEN** se suelta el borde estirado en una posición que corresponde
  aproximadamente a 47 minutos de duración
- **THEN** la duración queda ajustada a 45 o a 60 minutos, nunca a un valor
  que no sea múltiplo de 15

### Requirement: Arrastrar sobre espacio vacío pregunta qué crear

Arrastrar sobre un espacio vacío de la grilla, sin soltar sobre ningún bloque existente, SHALL preguntar si se quiere crear un evento o una tarea en ese horario, y NUNCA SHALL crear uno de los dos por defecto sin esa pregunta.

#### Scenario: Arrastrar sobre espacio vacío ofrece las dos opciones

- **WHEN** se arrastra sobre un espacio vacío de la grilla entre las 16:00 y
  las 16:30 de un día sin nada programado
- **THEN** se pregunta si se quiere crear un evento o una tarea en ese horario
- **AND** no se crea nada hasta que se elija una de las dos opciones

### Requirement: Los hábitos sin horario se programan para un día puntual arrastrando un chip

Un hábito sin horario fijo SHALL aparecer en la vista de calendario como un chip suelto fuera de la grilla horaria, y arrastrar ese chip a un horario dentro de un día SHALL escribir un override de horario para ese día puntual en `habit_schedule_overrides`, sin modificar el horario habitual del hábito.

#### Scenario: Programar un hábito sin horario para hoy

- **WHEN** se arrastra el chip de un hábito sin horario fijo hasta las 09:00
  de hoy
- **THEN** se crea un override en `habit_schedule_overrides` para el día de
  hoy con horario 09:00
- **AND** el hábito sigue sin horario fijo para los demás días

#### Scenario: Programar un hábito para un día que no es hoy

- **WHEN** se arrastra el chip de un hábito sin horario fijo hasta las 18:00
  del martes de la semana que viene, en un día en que el hábito toca según su
  frecuencia
- **THEN** se crea un override para ese martes puntual con horario 18:00
- **AND** ningún otro día se ve afectado por ese cambio

#### Scenario: No se puede programar un día en que el hábito no corresponde

- **WHEN** se intenta arrastrar el chip de un hábito de "días específicos"
  hasta un día que no está entre los días marcados de su frecuencia
- **THEN** la operación se rechaza, porque ese día no es uno en que el hábito
  efectivamente toque

### Requirement: Ninguna de estas acciones queda disponible solo por arrastre

Por D24 y la regla de frontend que prohíbe acciones exclusivas de arrastre, cada una de las acciones de esta capacidad SHALL tener también un camino sin arrastre: mover un bloque de horario SHALL poder hacerse desde el selector de fecha y hora existente, estirar para cambiar la duración SHALL poder hacerse desde el campo de duración estimada, programar un hábito sin horario SHALL poder hacerse desde el menú de la tarjeta del hábito, y crear sobre espacio vacío SHALL poder hacerse desde el alta rápida o el botón de nuevo evento.

#### Scenario: Mover una tarea sin arrastrar

- **WHEN** se cambia el horario de una tarea desde el selector de fecha y
  hora de su detalle, sin usar ningún gesto de arrastre
- **THEN** la tarea queda con el nuevo horario, igual que si se hubiera
  arrastrado

#### Scenario: Cambiar la duración sin arrastrar

- **WHEN** se cambia la duración estimada de una tarea desde su campo de
  duración, sin estirar ningún borde
- **THEN** la tarea queda con la nueva duración

#### Scenario: Programar un hábito sin arrastrar

- **WHEN** se programa un hábito sin horario fijo para un día puntual desde
  el menú de su tarjeta, sin arrastrar ningún chip
- **THEN** se crea el mismo override que se crearía arrastrando

#### Scenario: Crear sobre un horario vacío sin arrastrar

- **WHEN** se crea un evento o una tarea con un horario puntual desde el alta
  rápida o el botón de nuevo evento, sin arrastrar sobre la grilla
- **THEN** el evento o la tarea quedan creados con ese horario, igual que si
  se hubieran creado arrastrando sobre espacio vacío

### Requirement: Mover una tarea sin hora a una hora concreta la pasa de due_date a due_at

Arrastrar o programar con un horario concreto una tarea que hasta ese momento solo tenía `due_date` SHALL vaciar `due_date` y SHALL escribir el momento resultante en `due_at`, respetando el constraint de D9 que hace estas dos columnas excluyentes entre sí.

#### Scenario: Una tarea de todo el día pasa a tener hora

- **WHEN** se arrastra a las 11:00 una tarea que hasta entonces solo tenía
  `due_date` sin hora
- **THEN** `due_date` queda en `null` y `due_at` queda con el momento
  correspondiente a las 11:00 de ese día

#### Scenario: due_date y due_at nunca quedan los dos con valor

- **WHEN** se completa el movimiento de una tarea sin hora a un horario
  concreto
- **THEN** exactamente una de las dos columnas, `due_date` o `due_at`, tiene
  valor, y la otra es `null`

### Requirement: Arrastrar a la fila de todo el día mueve de día sin dar horario

La fila de todo el día SHALL ser un destino de arrastre, una celda por día visible. Soltar ahí un bloque que ya era de todo el día SHALL moverlo a ese día conservando cuántos días de calendario ocupaba, sin darle horario; soltar ahí un bloque con horario SHALL quitarle el horario y dejarlo como bloque de todo el día de ese día. Para una tarea eso significa vaciar `due_at` y escribir `due_date`, el camino inverso del requirement anterior y con el mismo constraint de D9. Un hábito no SHALL cambiar por este gesto: su programación es siempre una hora puntual.

#### Scenario: Una tarea de todo el día se mueve a otro día

- **WHEN** se arrastra una tarea de todo el día del martes hasta la fila de
  todo el día del jueves
- **THEN** la tarea queda con `due_date` el jueves, `due_at` en `null`, y
  sigue apareciendo en la fila de todo el día, no en la grilla horaria

#### Scenario: Un bloque con horario soltado en la fila pierde la hora

- **WHEN** se arrastra una tarea programada a las 10:00 hasta la fila de todo
  el día de otro día
- **THEN** la tarea pasa a ser de todo el día de ese día, sin horario

#### Scenario: La fila está disponible aunque ese día no tenga nada de todo el día

- **WHEN** se arrastra un bloque hacia arriba y el día destino todavía no
  tiene ningún bloque de todo el día
- **THEN** la fila igual aparece durante el gesto y muestra el día destino
  resaltado

#### Scenario: Manda dónde quedó el puntero, no cuánto solapa el bloque

- **WHEN** se arrastra un bloque de una hora, más alto que la fila de todo el
  día, y se lo suelta con el puntero adentro de esa fila
- **THEN** el bloque pasa a ser de todo el día, aunque su rectángulo solape
  más superficie con la columna horaria de abajo
