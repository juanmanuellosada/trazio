# buscador Specification

## Purpose
TBD - created by archiving change fase-2-potencia. Update Purpose after archive.
## Requirements
### Requirement: El buscador requiere un mínimo de dos caracteres

El buscador SHALL buscar en el título y en la descripción de las tareas del
usuario. La búsqueda MUST NOT ejecutarse con menos de dos caracteres escritos.

#### Scenario: Un solo carácter no dispara la búsqueda

- **WHEN** el usuario escribe una sola letra en el buscador
- **THEN** no se ejecuta ninguna búsqueda ni se muestra ningún resultado

#### Scenario: Dos caracteres sí disparan la búsqueda

- **WHEN** el usuario escribe exactamente dos caracteres que coinciden con el
  título de alguna tarea
- **THEN** la búsqueda se ejecuta y esa tarea aparece entre los resultados

### Requirement: El buscador devuelve como máximo 50 resultados

El buscador SHALL limitar sus resultados a un máximo de 50 tareas por
búsqueda, aunque coincidan más.

#### Scenario: Más de 50 coincidencias se truncan a 50

- **WHEN** una búsqueda coincide con 80 tareas del usuario
- **THEN** el buscador muestra exactamente 50 resultados, no los 80

### Requirement: Orden de resultados: pendientes primero, después por fecha

Los resultados del buscador SHALL mostrarse primero las tareas pendientes y
después las completadas. Dentro de cada uno de esos dos grupos, SHALL
ordenarse por fecha.

#### Scenario: Una tarea pendiente aparece antes que una completada

- **WHEN** la búsqueda coincide con una tarea pendiente y con una tarea
  completada
- **THEN** la tarea pendiente aparece antes que la completada en el listado
  de resultados, sin importar sus fechas respectivas

### Requirement: La búsqueda es insensible a acentos y reconoce variantes en español

El buscador SHALL encontrar coincidencias sin distinguir acentos, y SHALL
aplicar una derivación de palabras en español (stemming) que reconozca
singular y plural de una misma raíz.

#### Scenario: Sin tildes encuentra la palabra con tilde

- **WHEN** existe una tarea con la palabra "reunión" en el título y el
  usuario busca "reunion" (sin tilde)
- **THEN** esa tarea aparece entre los resultados

#### Scenario: El plural encuentra la raíz en singular

- **WHEN** existe una tarea con la palabra "reunión" en el título y el
  usuario busca "reuniones"
- **THEN** esa tarea aparece entre los resultados

### Requirement: La búsqueda es literal y no corrige errores de tipeo

El buscador MUST NOT aplicar corrección ortográfica ni coincidencia difusa.
Un error de tipeo en el término buscado MUST NOT devolver coincidencias que
solo se explicarían por una corrección del texto escrito.

#### Scenario: Un error de tipeo no encuentra la palabra correcta

- **WHEN** existe una tarea con la palabra "reunión" en el título y el
  usuario busca "renuion" (con las letras trastocadas)
- **THEN** el buscador no devuelve esa tarea entre los resultados
- **AND** no se ofrece ninguna sugerencia de corrección ni "quisiste decir"

### Requirement: El buscador se abre con el atajo `S` desde el panel lateral

El atajo de teclado `S` SHALL abrir el buscador cuando se dispara con el foco
fuera de un campo de texto y desde el contexto del panel lateral.

#### Scenario: Presionar `S` en el panel lateral abre el buscador

- **WHEN** el usuario tiene el foco en el panel lateral (no en un campo de
  texto) y presiona `S`
- **THEN** se abre el buscador

### Requirement: Los resultados del buscador respetan la RLS

Los resultados de una búsqueda SHALL limitarse a las tareas del usuario
autenticado, respetando la misma política de RLS que rige el resto de la
aplicación.

#### Scenario: Una búsqueda no devuelve tareas de otro usuario

- **WHEN** el usuario A busca un término que coincide con tareas del título
  de una tarea del usuario B
- **THEN** esa tarea del usuario B no aparece entre los resultados del
  usuario A

### Requirement: El buscador es una paleta que se abre sobre la vista actual

El buscador SHALL abrirse como una capa por encima de la vista actual, y cerrarla SHALL
devolver al usuario exactamente a donde estaba. Abrir el buscador NUNCA SHALL hacer perder la
vista en la que el usuario estaba trabajando.

#### Scenario: Abrir y cerrar el buscador no cambia de vista

- **WHEN** el usuario está en un proyecto, abre el buscador y lo cierra sin elegir nada
- **THEN** SHALL seguir en ese proyecto, con la vista como estaba

#### Scenario: Elegir un resultado abre esa tarea

- **WHEN** el usuario elige una tarea de los resultados
- **THEN** SHALL abrirse esa tarea

### Requirement: El buscador se navega con el teclado

El buscador SHALL permitir recorrer sus opciones con las flechas, elegir la activa con Enter y
cerrarse con `Escape`, sin usar el mouse y sin recorrerlas con Tab.

Mientras el buscador está abierto, las teclas que el usuario escribe SHALL ir al campo de
búsqueda: NUNCA SHALL dispararse un atajo global de la aplicación por escribir en el buscador.

#### Scenario: Las flechas mueven la opción activa y Enter la elige

- **WHEN** el usuario escribe un término, baja con la flecha hasta un resultado y presiona
  Enter
- **THEN** SHALL abrirse ese resultado

#### Scenario: Escribir no dispara atajos globales

- **WHEN** el usuario escribe en el buscador un texto que contiene letras que son atajos de
  navegación
- **THEN** NUNCA SHALL navegarse a ninguna parte
- **AND** el texto SHALL quedar escrito en el campo

### Requirement: El buscador muestra recientes y accesos de navegación

Con el campo vacío, el buscador SHALL mostrar las tareas vistas recientemente y los accesos de
navegación de la aplicación. NUNCA SHALL mostrarse en blanco.

Los accesos de navegación SHALL mostrar su atajo, y ese atajo SHALL provenir del binding real,
NUNCA de un texto escrito a mano.

El mínimo de caracteres que rige para buscar tareas NUNCA SHALL aplicarse a los accesos de
navegación: SHALL poder filtrarse con una sola letra.

#### Scenario: Con el campo vacío se ven recientes y navegación

- **WHEN** el usuario abre el buscador y no escribe nada
- **THEN** SHALL verse las tareas vistas recientemente y los accesos de navegación

#### Scenario: Una tarea reciente que ya no existe no queda como opción muerta

- **WHEN** una tarea que figuraba entre las recientes fue eliminada
- **THEN** NUNCA SHALL ofrecerse como una opción que al elegirla no hace nada

#### Scenario: Un solo carácter ya filtra la navegación

- **WHEN** el usuario escribe una sola letra
- **THEN** los accesos de navegación SHALL filtrarse por esa letra
- **AND** los resultados de tareas SHALL seguir esperando al mínimo de caracteres

### Requirement: El buscador resuelve consultas del lenguaje de filtros

El buscador SHALL detectar cuando lo escrito parsea como una consulta del lenguaje de filtros y, en ese caso, resolverla con el mismo parser y la misma evaluación que usan los filtros guardados, NUNCA como búsqueda de texto.

Cuando lo escrito no parsea como consulta, SHALL resolverse como búsqueda de texto, conservando todo el comportamiento actual: mínimo de dos caracteres, tope de 50 resultados, orden de pendientes primero y después por fecha, e insensibilidad a acentos.

El tope de 50 resultados SHALL valer también en el modo consulta.

NUNCA SHALL ofrecerse un selector para elegir el modo: se decide por lo escrito.

#### Scenario: Una consulta se resuelve como consulta

- **WHEN** se escribe `priority:1 & due:overdue` en el buscador
- **THEN** SHALL devolver las tareas de prioridad 1 vencidas
- **AND** NUNCA SHALL buscar ese texto literal

#### Scenario: Un texto común sigue siendo búsqueda de texto

- **WHEN** se escribe `alquiler` en el buscador
- **THEN** SHALL buscarse como texto, con el comportamiento de siempre

#### Scenario: El tope vale en los dos modos

- **WHEN** una consulta coincide con más de 50 tareas
- **THEN** SHALL devolver como máximo 50

### Requirement: Un error de sintaxis se explica, no se esconde

Cuando lo escrito parece una consulta pero tiene un error de sintaxis, el buscador SHALL mostrar el error en español señalando la posición, con los mismos mensajes que al editar un filtro. NUNCA SHALL caer en silencio a búsqueda de texto ni devolver cero resultados sin explicar por qué.

#### Scenario: Un paréntesis sin cerrar se explica

- **WHEN** se escribe `(priority:1 & due:today` en el buscador
- **THEN** SHALL mostrarse un error en español indicando la posición del problema
- **AND** NUNCA SHALL mostrarse una lista vacía sin explicación

#### Scenario: Un texto con dos puntos que no empieza con un campo conocido sigue siendo texto

- **WHEN** se escribe `14:30` o `nota: comprar` en el buscador
- **THEN** SHALL buscarse como texto, con el comportamiento de siempre
- **AND** NUNCA SHALL mostrarse un error de sintaxis, porque lo que precede al primer ":" ("14", "nota") no es un campo conocido del lenguaje de consulta

### Requirement: Una consulta del buscador se puede guardar como filtro

Cuando lo escrito es una consulta válida, el buscador SHALL ofrecer guardarla como filtro, precargando la consulta en el alta de filtro. NUNCA SHALL obligar a reescribirla en otra pantalla.

#### Scenario: Guardar la consulta escrita

- **WHEN** se escribió una consulta válida en el buscador y se elige guardarla como filtro
- **THEN** SHALL abrirse el alta de filtro con esa consulta precargada

