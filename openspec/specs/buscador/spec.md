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

