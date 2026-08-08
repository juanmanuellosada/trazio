## MODIFIED Requirements

### Requirement: Modo lista agrupado por día

En modo lista, la vista Próximos SHALL agrupar las tareas por día de vencimiento, con "Hoy" y "Mañana" resaltados visualmente frente al resto de los días. Cada grupo de día SHALL mostrar un contador de tareas, el **tiempo planificado de ese día** (capacidad `carga-del-dia`) y un botón para agregar una tarea precargada con la fecha de ese día. El tiempo planificado SHALL acompañar al contador, NUNCA reemplazarlo.

En Próximos, a diferencia de Hoy, las tareas atrasadas NUNCA SHALL entrar en el tiempo planificado de ningún día: su lista agrupa por día de vencimiento, y las atrasadas viven en un bloque propio fuera de la ventana.

El tiempo planificado SHALL mostrarse únicamente en el modo lista. NUNCA SHALL mostrarse en el modo panel ni en el de calendario: una columna de panel no es un día, y la grilla del calendario ya expresa la carga visualmente.

#### Scenario: Hoy y mañana se destacan del resto

- **WHEN** la ventana de Próximos incluye tareas para hoy, para mañana y
  para pasado mañana
- **THEN** los grupos "Hoy" y "Mañana" se muestran con un estilo visual
  distinto al del resto de los grupos de día

#### Scenario: Cada día muestra su contador y su botón de agregar

- **WHEN** un día dentro de la ventana tiene 3 tareas
- **THEN** el grupo de ese día muestra el número 3 como contador
- **AND** ofrece un botón para agregar una tarea que precarga la fecha de
  vencimiento de ese día

#### Scenario: Cada día muestra su tiempo planificado junto al contador

- **WHEN** un día dentro de la ventana tiene 3 tareas que suman 2 horas 30 minutos
- **THEN** el grupo de ese día muestra el contador 3 y el tiempo "2h 30m planificadas"

#### Scenario: El modo panel no muestra el tiempo planificado

- **WHEN** Próximos se ve en modo panel
- **THEN** NUNCA SHALL mostrarse el tiempo planificado en ninguna columna
