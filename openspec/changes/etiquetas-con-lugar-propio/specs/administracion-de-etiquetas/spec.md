## ADDED Requirements

### Requirement: La pantalla de administración se alcanza desde la navegación principal

La pantalla de administración de etiquetas SHALL ser alcanzable desde el acceso
"Etiquetas" del panel lateral y desde el acorde `G E`. NUNCA SHALL ser alcanzable
únicamente desde el menú de cuenta.

#### Scenario: Se llega desde el panel lateral

- **WHEN** el usuario hace clic en el acceso "Etiquetas" del panel lateral
- **THEN** SHALL abrirse la pantalla de administración de etiquetas

#### Scenario: Se llega por atajo de teclado

- **WHEN** el usuario presiona el acorde `G E` desde cualquier pantalla
- **THEN** SHALL abrirse la pantalla de administración de etiquetas

#### Scenario: El menú de cuenta deja de ofrecerla

- **WHEN** el usuario abre el menú de cuenta del panel lateral
- **THEN** ese menú NUNCA SHALL ofrecer una entrada "Etiquetas"

### Requirement: Una etiqueta se administra también desde su propia página

La página de una etiqueta SHALL ofrecer, sobre esa etiqueta, las mismas acciones que
la pantalla de administración: renombrar, recolorear, marcar o desmarcar como favorita
y eliminar. Esas acciones SHALL usar los mismos diálogos de edición y de confirmación
de borrado que usa la pantalla de administración, de modo que la confirmación previa a
eliminar rija igual desde las dos superficies.

#### Scenario: Renombrar desde la página de la etiqueta

- **WHEN** el usuario renombra la etiqueta desde `/etiquetas/<id>`
- **THEN** el nuevo nombre SHALL reflejarse en todos los chips donde esa etiqueta ya
  estaba asignada, igual que si se hubiera renombrado desde la administración

#### Scenario: Eliminar desde la página de la etiqueta exige confirmación

- **WHEN** el usuario elige eliminar la etiqueta desde `/etiquetas/<id>`
- **THEN** el sistema SHALL pedir confirmación antes de eliminarla

#### Scenario: Al eliminar la etiqueta que se está mirando, la aplicación no queda en una página inexistente

- **WHEN** el usuario confirma la eliminación de la etiqueta desde `/etiquetas/<id>`
- **THEN** la aplicación SHALL navegar a la pantalla de administración de etiquetas
- **AND** NUNCA SHALL permanecer en la página de una etiqueta que ya no existe

#### Scenario: Marcar como favorita desde la página de la etiqueta

- **WHEN** el usuario marca la etiqueta como favorita desde `/etiquetas/<id>`
- **THEN** esa etiqueta SHALL pasar a mostrarse en la sección Favoritos del panel
  lateral
- **AND** SHALL dejar de listarse en la lista colapsable de etiquetas no favoritas
