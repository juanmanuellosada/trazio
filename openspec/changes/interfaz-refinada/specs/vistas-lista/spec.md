## MODIFIED Requirements

### Requirement: Ancho de contenido adaptativo en las vistas de lista

El ancho de la columna de contenido de las vistas de lista SHALL crecer junto
con el ancho de la ventana hasta un tope máximo, en vez de detenerse en un
ancho fijo angosto, y la metadata de una tarea SHALL acompañar al título en
vez de fijarse al borde derecho del contenedor. Por encima de un umbral de
ancho disponible, la columna de contenido SHALL centrarse en el espacio que
le queda al panel lateral, de forma que los márgenes se lean como aire; por
debajo de ese umbral, SHALL quedar alineada a la izquierda, pegada al panel
lateral, como hasta ahora. El valor concreto del tope máximo, el umbral de
centrado y el comportamiento intermedio los define la skill de diseño
`ui-ux-pro-max`; este requisito fija el comportamiento, no un número.

#### Scenario: El contenido usa más ancho en una pantalla amplia

- **WHEN** la ventana tiene un ancho de escritorio amplio
- **THEN** el ancho de la columna de contenido de la vista SHALL ser mayor
  que en una pantalla angosta, hasta el tope máximo definido por el sistema
  de diseño
- **AND** el ancho SHALL NOT quedar detenido en el valor fijo angosto
  anterior

#### Scenario: La metadata acompaña al título en vez de pegarse al borde

- **WHEN** se muestra el título de una tarea junto a su metadata (fecha,
  prioridad, etc.) en una pantalla ancha
- **THEN** la metadata SHALL mostrarse a una distancia acotada del título
- **AND** NUNCA SHALL mostrarse pegada al borde derecho del contenedor con un
  espacio vacío grande entre el título y la metadata

#### Scenario: El contenido se centra por encima del umbral de ancho

- **WHEN** el ancho disponible para la columna de contenido supera el
  umbral que define la skill de diseño
- **THEN** la columna de contenido se centra en el espacio disponible junto
  al panel lateral

#### Scenario: El contenido queda alineado a la izquierda por debajo del umbral

- **WHEN** el ancho disponible para la columna de contenido no alcanza el
  umbral que define la skill de diseño
- **THEN** la columna de contenido queda alineada a la izquierda, pegada al
  panel lateral, sin centrarse
