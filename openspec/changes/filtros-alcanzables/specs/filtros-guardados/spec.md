## ADDED Requirements

### Requirement: Los filtros se alcanzan desde la navegación principal

El panel lateral SHALL ofrecer Filtros como acceso principal, junto a Etiquetas, Hábitos y Completado. NUNCA SHALL ser necesario conocer la ruta de antemano ni encontrarla dentro del menú de la cuenta para llegar a la pantalla de filtros.

El enlace a filtros dentro del menú de la cuenta SHALL quitarse: con el acceso principal deja de hacer falta, y dos caminos al mismo lugar —uno en un menú de tema, configuración y cerrar sesión— hacen dudar de si son lo mismo.

#### Scenario: Se llega a los filtros desde el panel lateral

- **WHEN** se abre el panel lateral sin haber creado ningún filtro
- **THEN** SHALL verse un acceso principal a Filtros
- **AND** SHALL llevar a la pantalla de filtros

#### Scenario: El menú de la cuenta ya no lleva a filtros

- **WHEN** se abre el menú de la cuenta
- **THEN** NUNCA SHALL ofrecerse un acceso a la pantalla de filtros

### Requirement: La lista de filtros no desaparece por estar vacía

La lista de filtros del panel lateral NUNCA SHALL ocultarse por no tener ninguno: SHALL mostrar un estado vacío con un acceso para crear el primero.

El estado vacío NUNCA SHALL explicar el lenguaje de consulta: la pantalla de alta ya muestra los errores en español y cuenta las coincidencias mientras se escribe.

#### Scenario: Sin filtros, la lista invita a crear el primero

- **WHEN** se abre el panel lateral en una cuenta sin ningún filtro
- **THEN** la lista de filtros SHALL verse igual
- **AND** SHALL ofrecer crear el primero

#### Scenario: El estado vacío no da una clase de sintaxis

- **WHEN** se ve el estado vacío de la lista de filtros
- **THEN** NUNCA SHALL mostrarse una explicación del lenguaje de consulta

### Requirement: La pantalla de filtros explica el lenguaje con ejemplos

Donde se escribe una consulta SHALL ofrecerse una referencia del lenguaje que incluya todos los campos disponibles con sus valores posibles, los operadores de combinación y agrupación, y ejemplos concretos.

Los ejemplos SHALL insertarse en el campo de consulta al tocarlos, para que la vista previa del conteo de coincidencias —que ya existe y corre en vivo— muestre al instante cuántas tareas devuelven sobre los datos propios.

La lista de campos de la referencia y la que el parser usa para su error de campo desconocido SHALL derivar de una única fuente. NUNCA SHALL mantenerse por separado: el día que el lenguaje gane un campo, una referencia desactualizada mentiría, y una ayuda que miente es peor que ninguna.

#### Scenario: La referencia lista todos los campos

- **WHEN** se abre el alta de un filtro
- **THEN** SHALL poder consultarse una referencia con todos los campos del lenguaje, sus valores y los operadores

#### Scenario: Tocar un ejemplo lo prueba

- **WHEN** se toca un ejemplo de la referencia
- **THEN** ese ejemplo SHALL quedar en el campo de consulta
- **AND** la vista previa SHALL mostrar cuántas tareas coinciden

#### Scenario: La referencia no se desactualiza sola

- **WHEN** se agrega un campo nuevo al lenguaje de consulta
- **THEN** SHALL aparecer en la referencia sin mantenerla aparte
