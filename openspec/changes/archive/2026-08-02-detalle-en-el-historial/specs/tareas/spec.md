## ADDED Requirements

### Requirement: Abrir el detalle deja una entrada en el historial

Abrir el detalle de una tarea dentro de la aplicación SHALL agregar una entrada al
historial de navegación. Volver atrás SHALL cerrar el detalle y dejar al usuario donde
estaba, y NUNCA SHALL sacarlo de la aplicación.

Cerrar el detalle por cualquier otra vía —el botón de cerrar, `Escape`, o hacer clic
fuera— SHALL dejar el historial en el mismo estado que si se hubiera vuelto atrás: NUNCA
SHALL acumular entradas que después hagan que volver atrás no produzca ningún efecto
visible.

Abrir una tarea desde el detalle de otra SHALL encadenar entradas, de modo que volver atrás
devuelva al detalle anterior.

#### Scenario: Volver atrás cierra el detalle

- **WHEN** el usuario abre el detalle de una tarea y usa el botón de volver atrás del
  navegador
- **THEN** el detalle SHALL cerrarse
- **AND** el usuario SHALL quedar en la vista desde la que lo abrió

#### Scenario: Volver atrás desde una subtarea abierta desde su padre

- **WHEN** el usuario abre el detalle de una tarea, desde ahí abre el detalle de una de sus
  subtareas, y vuelve atrás
- **THEN** SHALL volver al detalle de la tarea padre

#### Scenario: Cerrar con el botón no deja entradas muertas

- **WHEN** el usuario abre y cierra el detalle con el botón de cerrar, y repite eso varias
  veces, y después vuelve atrás
- **THEN** volver atrás SHALL producir un efecto visible
- **AND** NUNCA SHALL requerir volver atrás varias veces para salir de la vista

#### Scenario: Cerrar con Escape se comporta igual

- **WHEN** el usuario abre el detalle y lo cierra con `Escape`
- **THEN** el historial SHALL quedar como si hubiera vuelto atrás

### Requirement: El detalle de una subtarea muestra su tarea padre

El detalle de una tarea que tiene padre SHALL mostrar cuál es esa tarea padre y SHALL
permitir abrirla desde ahí. El detalle de una tarea sin padre NUNCA SHALL mostrar ese
acceso.

Se muestra el **padre directo**. El detalle NUNCA SHALL dibujar la cadena completa de
ancestros: las subtareas no tienen límite de anidamiento y esa cadena puede ser larga e
impredecible.

#### Scenario: Una subtarea muestra su padre

- **WHEN** el usuario abre el detalle de una subtarea
- **THEN** SHALL verse cuál es su tarea padre

#### Scenario: Abrir el padre desde la subtarea

- **WHEN** el usuario usa ese acceso desde el detalle de una subtarea
- **THEN** SHALL abrirse el detalle de la tarea padre
- **AND** volver atrás SHALL devolver al detalle de la subtarea

#### Scenario: Una tarea de primer nivel no muestra ningún padre

- **WHEN** el usuario abre el detalle de una tarea que no es subtarea de ninguna
- **THEN** NUNCA SHALL mostrarse un acceso a una tarea padre

#### Scenario: Una subtarea anidada muestra solo su padre directo

- **WHEN** el usuario abre el detalle de una subtarea que a su vez cuelga de otra subtarea
- **THEN** SHALL mostrarse únicamente su padre directo
- **AND** NUNCA SHALL mostrarse la cadena completa de ancestros
