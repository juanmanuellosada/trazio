## MODIFIED Requirements

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
