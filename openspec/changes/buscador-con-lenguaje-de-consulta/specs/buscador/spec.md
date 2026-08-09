## ADDED Requirements

### Requirement: El buscador resuelve consultas del lenguaje de filtros

El buscador SHALL detectar cuando lo escrito parsea como una consulta del lenguaje de filtros y, en ese caso, resolverla con el mismo parser y la misma evaluación que usan los filtros guardados, NUNCA como búsqueda de texto.

Cuando lo escrito no parsea como consulta, SHALL resolverse como búsqueda de texto, conservando todo el comportamiento actual: mínimo de dos caracteres, tope de 50 resultados, orden de pendientes primero y después por fecha, e insensibilidad a acentos.

El tope de 50 resultados SHALL valer también en el modo consulta.

NUNCA SHALL ofrecerse un selector para elegir el modo: se decide por lo escrito.

#### Scenario: Una consulta se resuelve como consulta

- **WHEN** se escribe `p1 due:overdue` en el buscador
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

### Requirement: Una consulta del buscador se puede guardar como filtro

Cuando lo escrito es una consulta válida, el buscador SHALL ofrecer guardarla como filtro, precargando la consulta en el alta de filtro. NUNCA SHALL obligar a reescribirla en otra pantalla.

#### Scenario: Guardar la consulta escrita

- **WHEN** se escribió una consulta válida en el buscador y se elige guardarla como filtro
- **THEN** SHALL abrirse el alta de filtro con esa consulta precargada
