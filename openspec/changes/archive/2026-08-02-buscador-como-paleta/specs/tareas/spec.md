## ADDED Requirements

### Requirement: El detalle ofrece abrir la tarea completa en la misma ventana

El menú de acciones del detalle de una tarea SHALL ofrecer abrir esa tarea a pantalla
completa **en la misma ventana**, navegando a su ruta propia. Esa acción SHALL convivir con la
de abrirla en una ventana aparte: son cosas distintas y las dos SHALL seguir disponibles.

#### Scenario: Abrir completo en esta ventana

- **WHEN** el usuario elige abrir la tarea completa en esta ventana desde el menú del detalle
- **THEN** la aplicación SHALL navegar a la ruta propia de esa tarea
- **AND** NUNCA SHALL abrirse una ventana ni una pestaña nueva

#### Scenario: Abrir en ventana aparte sigue existiendo

- **WHEN** el usuario abre el menú de acciones del detalle
- **THEN** SHALL ofrecerse tanto abrir en esta ventana como abrir en una ventana aparte
