## MODIFIED Requirements

### Requirement: Agrupar por, configurable

La barra SHALL ofrecer un control de agrupación con los valores nada, sección, fecha, prioridad y etiqueta.

En la forma de ver "panel", el valor elegido SHALL determinar cuáles son las columnas, según define la capacidad `modo-panel`. En la forma de ver "lista", SHALL seguir determinando los grupos dentro de la lista, sin cambios.

El valor "nada" NUNCA SHALL producir una sola columna en el panel: ahí significa la agrupación natural de la pantalla, no la ausencia de agrupación.

El valor "etiqueta" NUNCA SHALL ofrecerse en la forma de ver "panel", donde una tarea con varias etiquetas aparecería repetida en varias columnas. Cuando la preferencia guardada es "etiqueta" y el usuario pasa a panel, el valor guardado NUNCA SHALL pisarse —volver a la lista SHALL encontrarlo intacto— y el panel SHALL comportarse como si fuera "nada".

El valor "sección" NUNCA SHALL ofrecerse en el panel de Hoy ni en el de Próximos: las dos pantallas cruzan proyectos, y una sección solo tiene sentido dentro de un proyecto (capacidad `modo-panel`, "Mover entre columnas de sección"). Cuando la preferencia guardada es "sección" y el usuario está en el panel de Hoy o de Próximos, el valor guardado NUNCA SHALL pisarse —volver a Bandeja o Proyecto SHALL encontrarlo intacto— y esas dos pantallas SHALL comportarse como si fuera "nada".

#### Scenario: Agrupar por etiqueta

- **WHEN** el usuario elige "etiqueta" en el control de agrupar por, en
  una vista donde algunas tareas comparten etiquetas y otras no tienen
  ninguna
- **THEN** las tareas se agrupan por etiqueta
- **AND** las que no tienen ninguna quedan juntas en un grupo aparte

#### Scenario: El control ofrece sección y fecha

- **WHEN** el usuario abre el control de agrupar por en la forma de ver "lista"
- **THEN** SHALL ver los valores nada, sección, fecha, prioridad y etiqueta

#### Scenario: Agrupar por fecha en modo panel

- **WHEN** el usuario está en modo panel y elige "fecha" en el control de agrupar por
- **THEN** las columnas SHALL pasar a ser los días con tareas, más una columna para las tareas sin fecha

#### Scenario: En modo panel no se ofrece agrupar por etiqueta

- **WHEN** el usuario está en modo panel y abre el control de agrupar por
- **THEN** NUNCA SHALL ver el valor "etiqueta"

#### Scenario: La preferencia de etiqueta sobrevive al paso por el panel

- **WHEN** el usuario tiene el agrupador en "etiqueta" desde la lista, pasa a modo panel y vuelve a la lista
- **THEN** el panel SHALL haberse comportado como si el agrupador fuera "nada"
- **AND** al volver a la lista el agrupador SHALL seguir en "etiqueta"

#### Scenario: En el panel de Hoy y de Próximos no se ofrece agrupar por sección

- **WHEN** el usuario está en el panel de Hoy o en el de Próximos y abre el control de agrupar por
- **THEN** NUNCA SHALL ver el valor "sección"

#### Scenario: La preferencia de sección sobrevive al paso por Hoy o Próximos

- **WHEN** el usuario tiene el agrupador en "sección" desde el panel de Bandeja o de Proyecto, y pasa al panel de Próximos
- **THEN** Próximos SHALL haberse comportado como si el agrupador fuera "nada"
- **AND** al volver a Bandeja o Proyecto el agrupador SHALL seguir en "sección"
