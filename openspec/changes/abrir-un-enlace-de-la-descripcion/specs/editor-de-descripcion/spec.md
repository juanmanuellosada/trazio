## ADDED Requirements

### Requirement: Abrir un enlace de la descripción

El editor de descripción SHALL permitir abrir un enlace que ya está en la descripción,
en una pestaña nueva, sin salir de la tarea. El gesto SHALL ser el clic con el
modificador Ctrl (Cmd en Mac). El clic sin modificador SHALL seguir colocando el cursor
y NUNCA SHALL abrir nada, porque la zona es un campo de edición. El clic con modificador
NUNCA SHALL dejar el párrafo seleccionado en bloque ni mover el cursor.

Además del gesto con modificador, el editor SHALL ofrecer al menos un camino para abrir
el enlace que no dependa de un modificador de teclado, alcanzable con pantalla táctil y
con teclado, porque en un teléfono no hay Ctrl.

El editor SHALL abrir únicamente enlaces con esquema `http` o `https`. Cualquier otro
esquema —incluido `javascript:` y `data:`— y cualquier dirección relativa NUNCA SHALL
abrirse, aunque esté guardada en la descripción.

Esta capacidad SHALL aplicar solo a la zona de edición. La vista pública de solo lectura
de un proyecto compartido SHALL seguir abriendo sus enlaces como lo hace hoy, con un clic
simple, y ese clic NUNCA SHALL abrir dos pestañas.

#### Scenario: Ctrl+clic abre el enlace en una pestaña nueva

- **WHEN** se hace clic con Ctrl (o Cmd en Mac) apretado sobre un enlace de la
  descripción de una tarea
- **THEN** el enlace se abre en una pestaña nueva
- **AND** se abre una sola pestaña
- **AND** el párrafo no queda seleccionado en bloque

#### Scenario: El clic simple sigue colocando el cursor

- **WHEN** se hace clic sin ningún modificador sobre un enlace de la descripción
- **THEN** el cursor se coloca en esa posición del texto
- **AND** no se abre ninguna pestaña

#### Scenario: Hay un camino para abrir el enlace sin modificador

- **WHEN** el cursor está dentro de un enlace y se abre el menú contextual del editor
- **THEN** el menú ofrece la opción de abrir el enlace
- **AND** al elegirla el enlace se abre en una pestaña nueva
- **AND** con el cursor fuera de un enlace la opción no aparece

#### Scenario: Un esquema que no es web no se abre

- **WHEN** un enlace de la descripción tiene un `href` cuyo esquema no es `http` ni
  `https` —por ejemplo `javascript:`— y se usa el gesto con modificador sobre él
- **THEN** no se abre ninguna pestaña
- **AND** no se ejecuta nada de ese `href`

#### Scenario: La vista pública de solo lectura no cambia

- **WHEN** se hace clic sobre un enlace en la descripción de una tarea de la vista
  pública de solo lectura de un proyecto
- **THEN** el enlace se abre en una pestaña nueva, como antes de este cambio
- **AND** se abre una sola pestaña
