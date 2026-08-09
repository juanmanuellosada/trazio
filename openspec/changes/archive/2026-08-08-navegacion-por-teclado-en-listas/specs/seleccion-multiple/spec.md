## ADDED Requirements

### Requirement: Seleccionar y extender la selección con el teclado

`X` SHALL alternar la fila señalada por el cursor entre seleccionada y no seleccionada,
con el mismo efecto que un clic en su casillero: si el modo de selección estaba
inactivo, SHALL activarse.

`⇧↓` y `⇧↑` SHALL mover el cursor y extender la selección hasta la fila nueva, con el
mismo resultado que un `⇧`clic sobre ella: SHALL seleccionarse todas las filas entre el
ancla y la fila nueva, en el orden visual actual, inclusive ambos extremos.

La extensión por teclado SHALL usar el mismo ancla que la extensión con `⇧`clic; NUNCA
SHALL mantenerse un ancla propia del teclado.

#### Scenario: X selecciona la fila señalada

- **WHEN** el cursor está en una tarea sin ninguna selección activa y se presiona `X`
- **THEN** el modo de selección se activa, esa tarea queda seleccionada, y aparece la
  barra de acciones en lote mostrando "1 seleccionada"

#### Scenario: X sobre una fila ya seleccionada la deselecciona

- **WHEN** el cursor está en una tarea seleccionada y se presiona `X`
- **THEN** esa tarea SHALL quedar deseleccionada

#### Scenario: Shift más flecha extiende la selección

- **WHEN** se selecciona la tercera fila con `X` y luego se presiona `⇧↓` cuatro veces
- **THEN** las cinco filas de la tercera a la séptima quedan seleccionadas y la barra
  muestra "5 seleccionadas"

#### Scenario: El teclado y el clic comparten el ancla

- **WHEN** se hace clic en el casillero de la tercera fila y luego se presiona `⇧↓` cuatro veces
- **THEN** el rango SHALL calcularse desde esa tercera fila, igual que con un `⇧`clic en
  la séptima

#### Scenario: Escape sale del modo de selección y deja el cursor

- **WHEN** hay filas seleccionadas por teclado y se presiona `Escape`
- **THEN** la selección SHALL vaciarse y la barra de acciones SHALL ocultarse
- **AND** el cursor SHALL seguir en la fila donde estaba
