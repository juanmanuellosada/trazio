## ADDED Requirements

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
