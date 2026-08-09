## ADDED Requirements

### Requirement: Compartir un proyecto desde su menú

El menú de acciones de un proyecto SHALL ofrecer generar, copiar, regenerar y desactivar su enlace de lectura, junto a editar, duplicar, archivar y eliminar. La Bandeja de entrada NUNCA SHALL ofrecerlo.

Un proyecto compartido SHALL mostrar una indicación visible de que lo está: NUNCA SHALL quedar compartido sin que se note.

#### Scenario: Compartir está en el menú del proyecto

- **WHEN** se abre el menú de acciones de un proyecto
- **THEN** SHALL ofrecerse generar o administrar su enlace de lectura

#### Scenario: Un proyecto compartido se distingue

- **WHEN** un proyecto tiene enlace de lectura activo
- **THEN** SHALL verse una indicación de que está compartido
