## MODIFIED Requirements

### Requirement: Ruta de una tarea suelta y detalle en la app

Una tarea SHALL tener una ruta propia en `app/(app)/tarea/[id]`, servida a
pantalla completa y con su propio `<title>` de documento. Esta ruta SHALL ser el
destino de "copiar enlace directo" y de "abrir en ventana aparte". Dentro de la
app, el detalle de una tarea SHALL mostrarse como un modal centrado por encima
de la pantalla, salvo en teléfono, donde SHALL mostrarse a pantalla completa. El
título y la descripción del detalle SHALL autoguardarse, sin requerir una
acción explícita de guardado.

En pantallas anchas, el detalle SHALL organizarse en dos columnas: a la izquierda lo que
el usuario escribe —título, descripción, subtareas y comentarios— y a la derecha lo que
el usuario elige —proyecto, fecha, fecha límite, prioridad, etiquetas, recordatorios y
repetición—. Cuando el ancho no alcanza para dos columnas, el detalle SHALL colapsar a
una sola, y ahí los atributos SHALL ubicarse después del título y **antes** de la
descripción, nunca al final: mandarlos al fondo obligaría a desplazarse hasta abajo para
cambiar una fecha.

El ancho del modal SHALL pedirse como una variante con nombre del componente de diálogo,
y NUNCA SHALL fijarse con una clase de ancho suelta en el detalle.

#### Scenario: La ruta de tarea suelta tiene su propio título de documento

- **WHEN** se navega directamente a `app/(app)/tarea/[id]` de una tarea
  determinada
- **THEN** la página se muestra a pantalla completa
- **AND** el `<title>` del documento corresponde a esa tarea

#### Scenario: Abrir en ventana aparte usa esa ruta

- **WHEN** se usa la acción "abrir en ventana aparte" sobre una tarea
- **THEN** se abre `app/(app)/tarea/[id]` con el `id` de esa tarea

#### Scenario: El detalle es un modal centrado en escritorio

- **WHEN** se abre el detalle de una tarea desde dentro de la app en una
  pantalla de escritorio
- **THEN** se muestra como un modal centrado por encima de la pantalla, sin
  ningún control para redimensionarlo

#### Scenario: En escritorio el contenido y los atributos están en columnas distintas

- **WHEN** se abre el detalle de una tarea en una pantalla ancha
- **THEN** el título, la descripción, las subtareas y los comentarios SHALL mostrarse en
  una columna
- **AND** el proyecto, la fecha, la fecha límite, la prioridad, las etiquetas, los
  recordatorios y la repetición SHALL mostrarse en la otra

#### Scenario: En ancho insuficiente colapsa a una columna con los atributos arriba

- **WHEN** el ancho disponible no alcanza para dos columnas
- **THEN** el detalle SHALL mostrarse en una sola columna
- **AND** los atributos SHALL aparecer después del título y antes de la descripción
- **AND** NUNCA SHALL quedar al final, después de los comentarios

#### Scenario: El detalle es pantalla completa en teléfono

- **WHEN** se abre el detalle de una tarea desde dentro de la app en una pantalla
  de teléfono
- **THEN** se muestra a pantalla completa, no como modal

#### Scenario: Los atajos del detalle siguen funcionando tras la reorganización

- **WHEN** se usan los atajos del detalle para fecha, fecha límite, prioridad,
  recordatorios, proyecto, etiquetas y subtareas
- **THEN** cada uno SHALL abrir el control que le corresponde, en cualquiera de las dos
  columnas donde haya quedado

#### Scenario: Título y descripción se autoguardan

- **WHEN** se edita el título o la descripción de una tarea desde el modal de
  detalle, sin usar ningún botón de guardar
- **THEN** el cambio queda persistido
