## ADDED Requirements

### Requirement: Ruta propia por etiqueta

Cada etiqueta SHALL tener una ruta propia (`/etiquetas/<id>`) que muestra todas las tareas que la tienen asignada, sin importar a qué proyecto pertenezca cada una. La página SHALL usar la clave `etiqueta:<id>` para sus opciones de vista y SHALL ordenar y agrupar sus tareas según esas opciones, igual que cualquier vista de lista.

#### Scenario: Tareas de proyectos distintos aparecen juntas

- **WHEN** la etiqueta `Compras` está asignada a una tarea del proyecto
  "Casa" y a otra del proyecto "Trabajo"
- **THEN** la página `/etiquetas/<id>` de `Compras` muestra ambas tareas
- **AND** ninguna de las dos deja de mostrarse por pertenecer a proyectos
  distintos

#### Scenario: Una tarea sin la etiqueta no aparece

- **WHEN** una tarea no tiene asignada la etiqueta `Compras`
- **THEN** esa tarea no aparece en la página de la etiqueta `Compras`

### Requirement: Marcar y desmarcar una etiqueta como favorita

El sistema SHALL permitir marcar y desmarcar cualquier etiqueta como favorita, escribiendo la columna `labels.is_favorite` que ya existe en la base y que hasta fase 1 no se leía desde la interfaz.

#### Scenario: Marcar una etiqueta como favorita

- **WHEN** el usuario marca la etiqueta `Compras` como favorita
- **THEN** `labels.is_favorite` de esa etiqueta pasa a `true`
- **AND** la marca persiste al recargar la aplicación

#### Scenario: Desmarcar una etiqueta favorita

- **WHEN** el usuario desmarca como favorita una etiqueta que ya lo era
- **THEN** `labels.is_favorite` de esa etiqueta pasa a `false`
- **AND** la etiqueta deja de aparecer en la sección Favoritos del panel
  lateral

### Requirement: Las etiquetas favoritas aparecen en la sección Favoritos del panel lateral

El panel lateral SHALL mostrar toda etiqueta con `is_favorite` en `true` dentro de la misma sección Favoritos donde ya aparecen los proyectos marcados como favoritos, y cada una SHALL enlazar a su propia página.

#### Scenario: Una etiqueta favorita convive con proyectos favoritos

- **WHEN** el usuario tiene el proyecto "Casa" marcado como favorito y la
  etiqueta `Urgente` marcada como favorita
- **THEN** la sección Favoritos del panel lateral muestra ambos, el proyecto
  "Casa" y la etiqueta `Urgente`
- **AND** hacer clic sobre `Urgente` navega a `/etiquetas/<id>` de esa
  etiqueta

#### Scenario: Sin etiquetas favoritas, la sección no las muestra

- **WHEN** ninguna etiqueta del usuario tiene `is_favorite` en `true`
- **THEN** la sección Favoritos no muestra ninguna etiqueta, aunque sí pueda
  mostrar proyectos favoritos

### Requirement: Acceso "Etiquetas" en el panel lateral

El panel lateral SHALL mostrar un acceso "Etiquetas" con la lista colapsable de las etiquetas del usuario que no están marcadas como favoritas, cada una enlazando a su propia página. Este acceso estaba explícitamente prohibido en fase 1 y pasa a existir en fase 2.

#### Scenario: Las etiquetas no favoritas aparecen en la lista colapsable

- **WHEN** el usuario tiene las etiquetas `Compras` (favorita) y `Lectura`
  (no favorita)
- **THEN** el panel lateral muestra un acceso "Etiquetas" que, al
  expandirse, lista `Lectura`
- **AND** `Compras` no aparece ahí porque ya se muestra en Favoritos

#### Scenario: Hacer clic en una etiqueta de la lista navega a su página

- **WHEN** el usuario expande el acceso "Etiquetas" y hace clic en
  `Lectura`
- **THEN** la aplicación navega a `/etiquetas/<id>` de `Lectura`

### Requirement: Selección múltiple en la página de etiqueta

La página de una etiqueta SHALL soportar el mismo modo de selección múltiple que las demás vistas de lista, con su barra de acciones en lote.

#### Scenario: Seleccionar varias tareas desde la página de etiqueta

- **WHEN** el usuario entra en modo selección en `/etiquetas/<id>` y marca
  tres tareas
- **THEN** aparece la barra de acciones en lote con esas tres tareas
  seleccionadas
- **AND** las acciones de la barra (mover, cambiar prioridad, cambiar
  fecha, eliminar) se aplican a las tres

### Requirement: Barra de opciones de vista en la página de etiqueta

La página de una etiqueta SHALL mostrar la barra de opciones de vista, con sus opciones persistidas bajo la clave `etiqueta:<id>` en `view_preferences`.

#### Scenario: Las opciones elegidas persisten para esa etiqueta

- **WHEN** el usuario abre `/etiquetas/<id>` de la etiqueta `Lectura` y
  configura "agrupar por" prioridad
- **THEN** al volver a abrir la página de `Lectura` más tarde, sigue
  agrupada por prioridad
- **AND** la página de otra etiqueta distinta no se ve afectada por ese
  cambio
