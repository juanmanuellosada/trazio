# seleccion-multiple Specification

## Purpose
TBD - created by archiving change fase-2-potencia. Update Purpose after archive.
## Requirements
### Requirement: Pantallas donde está disponible la selección múltiple

La selección múltiple SHALL estar disponible en las pantallas Bandeja de
entrada, Hoy, Próximos, Proyecto, Etiqueta y Filtro.

#### Scenario: Disponible en las seis pantallas de lista

- **WHEN** se está en la Bandeja de entrada, en Hoy, en Próximos, en la
  pantalla de un proyecto, en la pantalla de una etiqueta o en la pantalla de
  resultados de un filtro
- **THEN** cada tarea de la lista muestra, al pasar el cursor sobre ella, un
  casillero de selección independiente del casillero de completar

### Requirement: Entrar al modo de selección

El modo de selección SHALL activarse al hacer clic en el casillero de
selección de una tarea, y **también** al hacer `Ctrl`+clic —o el modificador equivalente de la
plataforma— sobre la tarea. Al activarse, esa tarea queda seleccionada y aparece
la barra de acciones en lote.

El casillero NUNCA SHALL dejar de funcionar: en una pantalla táctil no hay modificadores, y
sin él no habría forma de seleccionar.

#### Scenario: Un clic en el casillero de selección activa el modo

- **WHEN** en una lista sin ninguna tarea seleccionada, se hace clic en el
  casillero de selección de una tarea
- **THEN** el modo de selección se activa, esa tarea queda seleccionada, y
  aparece la barra de acciones en lote mostrando "1 seleccionada"

#### Scenario: Ctrl+clic sobre la tarea activa el modo

- **WHEN** en una lista sin ninguna tarea seleccionada, se hace `Ctrl`+clic sobre una tarea
- **THEN** el modo de selección se activa y esa tarea queda seleccionada
- **AND** NUNCA SHALL abrirse el detalle de esa tarea

#### Scenario: Ctrl+clic sobre una tarea ya seleccionada la deselecciona

- **WHEN** con el modo activo se hace `Ctrl`+clic sobre una tarea que ya estaba seleccionada
- **THEN** esa tarea SHALL quedar deseleccionada

#### Scenario: Ctrl+clic no abre el menú de acciones

- **WHEN** se hace `Ctrl`+clic sobre una tarea
- **THEN** NUNCA SHALL abrirse el menú de acciones de la tarea, que se abre con clic derecho

### Requirement: Seleccionar y deseleccionar tareas individuales

Con el modo de selección activo, cada casillero de selección SHALL quedar
visible sin necesidad de pasar el cursor por encima, y un clic sobre él SHALL
alternar esa tarea entre seleccionada y no seleccionada.

#### Scenario: Clic en otro casillero suma una tarea a la selección

- **WHEN** con una tarea ya seleccionada, se hace clic en el casillero de
  selección de otra tarea de la misma lista
- **THEN** ambas tareas quedan seleccionadas y la barra muestra "2
  seleccionadas"

#### Scenario: Clic en un casillero ya seleccionado la saca de la selección

- **WHEN** con dos tareas seleccionadas, se hace clic en el casillero de una
  de ellas
- **THEN** esa tarea queda deseleccionada y la barra pasa a mostrar "1
  seleccionada"

### Requirement: Selección de rango con Shift+clic

`⇧clic` (Shift+clic) sobre el casillero de selección de una tarea SHALL
seleccionar todas las tareas entre la última tarea sobre la que se hizo clic y
la tarea clickeada, en el orden visual actual de la lista, inclusive ambos
extremos.

#### Scenario: Shift+clic selecciona un rango completo

- **WHEN** se hace clic en el casillero de selección de la tarea que ocupa la
  tercera posición de la lista, y luego se hace `⇧clic` en el casillero de la
  tarea que ocupa la séptima posición
- **THEN** las cinco tareas de la tercera a la séptima posición quedan
  seleccionadas y la barra muestra "5 seleccionadas"

### Requirement: Salir del modo de selección

`Escape` SHALL salir del modo de selección, deseleccionando todas las tareas y
ocultando la barra de acciones en lote. El modo de selección SHALL salir
también automáticamente cuando la cantidad de tareas seleccionadas llega a
cero.

#### Scenario: Escape sale del modo de selección

- **WHEN** con tres tareas seleccionadas se presiona `Escape`
- **THEN** las tres tareas quedan deseleccionadas y la barra de acciones en
  lote desaparece

#### Scenario: Deseleccionar la última tarea sale del modo automáticamente

- **WHEN** con una sola tarea seleccionada, se hace clic en su casillero de
  selección para deseleccionarla
- **THEN** el modo de selección se desactiva y la barra de acciones en lote
  desaparece

### Requirement: Barra de acciones en lote

Con el modo de selección activo, la barra de acciones en lote SHALL ofrecer:
seleccionar todas las tareas visibles, mover las tareas seleccionadas a otro
proyecto o sección, cambiar la prioridad de las tareas seleccionadas, cambiar
la fecha de las tareas seleccionadas (con los atajos Hoy, Mañana y Sin fecha),
**aplicar etiquetas a las tareas seleccionadas**, y eliminar las tareas seleccionadas.

Aplicar etiquetas en lote SHALL **sumar** las etiquetas elegidas a las que cada tarea ya
tiene. NUNCA SHALL reemplazar el conjunto de etiquetas de las tareas seleccionadas: al editar
varias a la vez el usuario no ve lo que cada una tenía, y reemplazar destruiría información
que no estaba mirando.

La barra SHALL poder agrupar sus acciones menos usadas detrás de un menú, para seguir siendo
legible en pantallas angostas. Eliminar NUNCA SHALL quedar como la acción más accesible de la
barra: es destructiva y se aplica a varias tareas a la vez.

#### Scenario: Seleccionar todas las tareas visibles

- **WHEN** con el modo de selección activo se elige la acción "seleccionar
  todas" en una lista de 15 tareas visibles
- **THEN** las 15 tareas quedan seleccionadas

#### Scenario: Aplicar una etiqueta en lote la suma a las que ya tenían

- **WHEN** se seleccionan tres tareas, una de ellas ya con la etiqueta `Casa`, y se aplica la
  etiqueta `Urgente`
- **THEN** las tres SHALL quedar con `Urgente`
- **AND** la que tenía `Casa` SHALL conservarla

#### Scenario: La barra sigue siendo usable en pantalla angosta

- **WHEN** se activa el modo de selección en una pantalla de teléfono
- **THEN** todas las acciones SHALL seguir siendo alcanzables, aunque algunas estén detrás de
  un menú

### Requirement: Las acciones en lote son deshacibles como una sola acción

Toda acción en lote SHALL empujar una única entrada a la pila de deshacer,
sin importar cuántas tareas afecte. Deshacer esa entrada SHALL revertir la
acción sobre todas las tareas afectadas de una sola vez.

#### Scenario: Deshacer una eliminación en lote de 12 tareas la revierte de una vez

- **WHEN** se eliminan 12 tareas seleccionadas y luego se presiona
  `Ctrl/Cmd+Z` una sola vez
- **THEN** las 12 tareas se restauran de una vez, y no hace falta presionar
  `Ctrl/Cmd+Z` doce veces

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

