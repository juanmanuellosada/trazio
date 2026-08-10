## ADDED Requirements

### Requirement: La acción "¿Qué hago ahora?" en el encabezado de Hoy

El encabezado de Hoy SHALL ofrecer la acción "¿Qué hago ahora?", junto al
tiempo libre y el pedido sin lugar (capacidad `carga-del-dia`). SHALL estar
disponible en las tres formas de ver, porque el encabezado es común a las
tres.

Al activarse, SHALL mirar el hueco entre ahora y el próximo bloque agendado
(evento con horario, tarea o hábito con hora) y proponer como mucho una
tarea.

#### Scenario: La acción está disponible en las tres formas de ver

- **WHEN** se cambia la forma de ver de Hoy entre lista, panel y calendario
- **THEN** "¿Qué hago ahora?" sigue disponible en el encabezado

### Requirement: El hueco se mide contra el próximo bloque agendado

El hueco disponible SHALL ser la ventana entre ahora y el inicio del
próximo bloque comprometido (evento, tarea o hábito con hora), o hasta la
hora de fin del día si no queda ningún bloque agendado por delante.

Un hueco de menos de 5 minutos NUNCA SHALL considerarse un hueco: SHALL
tratarse igual que si no hubiera ninguno.

#### Scenario: El hueco termina en el próximo bloque

- **WHEN** son las 13:00 y el próximo bloque agendado empieza a las 15:00
- **THEN** el hueco disponible es de 13:00 a 15:00

#### Scenario: Sin más bloques agendados, el hueco llega hasta el fin del día

- **WHEN** son las 18:00, la hora de fin del día es 22:00, y no queda ningún
  bloque agendado por delante
- **THEN** el hueco disponible es de 18:00 a 22:00

#### Scenario: Un hueco de menos de 5 minutos no cuenta

- **WHEN** el próximo bloque agendado empieza en 3 minutos
- **THEN** SHALL tratarse como si no hubiera hueco disponible

### Requirement: No hay hueco disponible

La acción SHALL decir hasta qué hora está ocupado, sin proponer ninguna
tarea, cuando no hay hueco disponible: el próximo bloque empieza en menos
de 5 minutos, o el día ya terminó.

#### Scenario: Se avisa hasta qué hora está ocupado

- **WHEN** el próximo bloque agendado empieza a las 15:00 y no hay hueco
  disponible antes
- **THEN** la acción muestra "Estás ocupado hasta las 15:00"

#### Scenario: El día terminado tampoco ofrece hueco

- **WHEN** el momento actual es posterior a la hora de fin del día
- **THEN** la acción indica que el día ya terminó
- **AND** NUNCA SHALL proponer ninguna tarea

### Requirement: Criterio de selección de la tarea propuesta

Las candidatas SHALL salir únicamente de las tareas que `carga-del-dia` ya
cuenta como pedido sin lugar en Hoy: pendientes, con duración estimada, sin
hora asignada, que vencen hoy o están atrasadas. Los hábitos NUNCA SHALL
proponerse: no tienen prioridad ni fecha límite con qué ordenarlos.

Una tarea sin duración estimada NUNCA SHALL ser candidata. Entre las
candidatas cuya duración entra en el hueco disponible, SHALL elegirse una
sola, en este orden:

1. Atrasada antes que una que vence hoy sin estar atrasada; entre atrasadas,
   la más vencida primero.
2. Entre tareas igual de atrasadas (o ninguna atrasada), la de fecha límite
   (`deadline`) más próxima; una tarea sin `deadline` SHALL ordenarse
   después de cualquiera que sí la tenga.
3. Entre tareas empatadas en fecha límite, la de mayor prioridad (Urgente >
   Alta > Media > Baja).
4. Entre tareas empatadas en prioridad, la de menor `position` (el orden
   manual que ya tienen en sus listas).

#### Scenario: La duración es un requisito duro

- **WHEN** el hueco disponible es de 30 minutos y la única candidata sin
  agendar dura 45 minutos
- **THEN** NUNCA SHALL proponerse esa tarea

#### Scenario: Una atrasada gana sobre una que vence hoy

- **WHEN** el hueco disponible es de 30 minutos, hay una tarea atrasada de
  20 minutos y una tarea que vence hoy de 20 minutos, ambas sin agendar
- **THEN** se propone la tarea atrasada

#### Scenario: La fecha límite pesa más que la prioridad

- **WHEN** dos candidatas entran en el hueco, ninguna atrasada, una tiene
  fecha límite mañana y prioridad Baja, la otra no tiene fecha límite y
  prioridad Urgente
- **THEN** se propone la que tiene fecha límite mañana

#### Scenario: Una tarea sin duración nunca es candidata

- **WHEN** hay un hueco disponible y la tarea sin agendar más urgente no
  tiene duración estimada cargada
- **THEN** esa tarea NUNCA SHALL proponerse

### Requirement: Hay hueco pero ninguna tarea entra

La acción SHALL decirlo, con un aviso distinto del de "no hay hueco
disponible", cuando hay hueco pero ninguna candidata cumple el requisito de
duración.

#### Scenario: Se avisa que ninguna tarea entra

- **WHEN** hay un hueco de 20 minutos disponible y todas las candidatas sin
  agendar duran más de 20 minutos, o no hay ninguna candidata
- **THEN** la acción avisa que no hay ninguna tarea que entre en ese hueco
- **AND** ese aviso SHALL ser distinto del de "no hay hueco disponible"

### Requirement: La acción funciona igual sin calendario conectado

"¿Qué hago ahora?" SHALL calcular el hueco y proponer una tarea con la
información disponible aunque el calendario no esté conectado, esté
cargando, o Google no responda: el próximo bloque agendado sale solo de
tareas y hábitos con hora.

#### Scenario: Sin calendario conectado la acción sigue funcionando

- **WHEN** la cuenta no tiene ningún calendario de Google conectado
- **THEN** "¿Qué hago ahora?" calcula el hueco con tareas y hábitos con hora
- **AND** propone una tarea si hay una que entre
