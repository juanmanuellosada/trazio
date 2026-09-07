## MODIFIED Requirements

### Requirement: Tareas, hábitos y eventos se dibujan juntos y se distinguen por forma

La grilla SHALL dibujar juntos los bloques de tareas, hábitos y eventos del rango visible, y los tres tipos SHALL distinguirse entre sí por la forma del bloque y no únicamente por el color, porque el color ya está tomado por el proyecto o la etiqueta de la tarea, o por el calendario de origen del evento.

Esa distinción por forma SHALL apoyarse en el borde del bloque y NUNCA SHALL apoyarse en el radio de sus esquinas: una tarea lleva borde grueso, un hábito lleva borde fino, y un evento lleva una barra lateral izquierda gruesa en lugar de un borde parejo.

Cada tipo SHALL conservar además al menos un marcador propio que no sea ni color ni borde, de modo que la distinción sobreviva aunque dos bloques coincidan en color y el borde se perciba mal: la tarea tiene su control de completar, el hábito tiene su emoji, y el evento tiene su ícono de calendario y no tiene control de completar.

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

#### Scenario: Una tarea y un hábito del mismo color y la misma duración se distinguen

- **WHEN** en la grilla hay una tarea y un hábito con el mismo color y la misma
  duración
- **THEN** el borde de la tarea SHALL ser más grueso que el de el hábito
- **AND** el hábito SHALL mostrar su emoji
- **AND** los dos bloques SHALL tener el mismo radio de esquinas

## ADDED Requirements

### Requirement: La forma de un bloque no depende de su duración

El radio de las esquinas de un bloque de la grilla SHALL ser el mismo para todos los bloques, cualquiera sea su tipo y cualquiera sea su duración, y NUNCA SHALL calcularse a partir del alto del bloque.

Esto vale también para el bloque de la fila de todo el día y para el que se arrastra: un mismo hábito SHALL verse con la misma forma esté donde esté.

Un radio expresado como "la mitad de lo que mida" NUNCA SHALL usarse en un bloque de la grilla, porque el alto de un bloque sale de su duración y un radio así convierte la duración en forma.

#### Scenario: El mismo hábito con distinta duración conserva su forma

- **WHEN** se comparan dos hábitos de la misma grilla, uno de diez minutos y
  otro de cuarenta y cinco
- **THEN** los dos SHALL tener el mismo radio de esquinas

#### Scenario: Un bloque largo no se convierte en óvalo

- **WHEN** se muestra un hábito de dos horas
- **THEN** su radio de esquinas SHALL ser el mismo que el de un hábito de diez
  minutos
- **AND** NUNCA SHALL verse como una cápsula ni como un óvalo

#### Scenario: Arrastrar un bloque no le cambia la forma

- **WHEN** se arrastra un bloque de hábito por la grilla
- **THEN** la copia que sigue al cursor SHALL tener el mismo radio que el
  bloque original
