## MODIFIED Requirements

### Requirement: Vistas de fase 1 en modo lista únicamente

Bandeja de entrada, Hoy, Proyecto y Completado SHALL seguir siendo las cuatro
vistas de esta capacidad, y SHALL renderizarse en modo lista por defecto.
Bandeja de entrada y Proyecto SHALL ofrecer también modo panel como
alternativa, según define la capacidad `modo-panel`; Hoy y Completado SHALL
seguir renderizándose únicamente en modo lista. Bandeja de entrada, Hoy y
Proyecto SHALL mostrar la barra de opciones de vista que define la capacidad
`opciones-de-vista`, desde donde pasan a controlarse el orden, la
agrupación, qué mostrar y el resto de sus opciones; Completado SHALL seguir
sin esa barra. El modo calendario sigue sin existir para las cuatro vistas:
es fase 4. Por decisión D25, el orden por defecto —antes de que el usuario
cambie nada desde la barra de opciones, donde exista— sigue siendo manual
por `position` en Bandeja de entrada y Proyecto, por hora en Hoy y por fecha
de completado descendente en Completado.

#### Scenario: Modo panel disponible en Bandeja de entrada y Proyecto

- **WHEN** un usuario abre Bandeja de entrada o Proyecto
- **THEN** esa vista ofrece cambiar a modo panel

#### Scenario: Hoy y Completado siguen solo en modo lista

- **WHEN** un usuario abre Hoy o Completado
- **THEN** esa vista no ofrece cambiar a modo panel
- **AND** ninguna de las cuatro vistas ofrece todavía modo calendario

#### Scenario: Barra de opciones de vista en Bandeja de entrada, Hoy y Proyecto

- **WHEN** un usuario abre Bandeja de entrada, Hoy o Proyecto
- **THEN** esa vista muestra la barra de opciones de vista

#### Scenario: Completado sigue sin barra de opciones de vista

- **WHEN** un usuario abre Completado
- **THEN** esa vista no muestra la barra de opciones de vista

#### Scenario: Los defaults de D25 se mantienen sin que el usuario cambie nada

- **WHEN** un usuario abre Hoy o Completado sin haber tocado sus opciones de vista
- **THEN** Hoy muestra sus tareas ordenadas por hora
- **AND** Completado muestra sus tareas ordenadas por fecha de completado descendente

## ADDED Requirements

### Requirement: Selección múltiple en Bandeja de entrada, Hoy y Proyecto

Bandeja de entrada, Hoy y Proyecto SHALL ofrecer selección múltiple de
tareas, con la barra de acciones en lote que define la capacidad
`seleccion-multiple`. Completado NUNCA SHALL ofrecer selección múltiple en
esta fase.

#### Scenario: Selección múltiple disponible en Bandeja de entrada, Hoy y Proyecto

- **WHEN** un usuario activa selección múltiple en Bandeja de entrada, Hoy o Proyecto
- **THEN** puede marcar más de una tarea a la vez
- **AND** aparece la barra de acciones en lote

#### Scenario: Completado no ofrece selección múltiple

- **WHEN** un usuario abre Completado
- **THEN** no existe ningún casillero de selección múltiple en esa vista
