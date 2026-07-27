## MODIFIED Requirements

### Requirement: Ciclo de vida completo de una tarea

Una tarea SHALL poder crearse, editarse, completarse, descompletarse, duplicarse,
moverse de proyecto o sección, reordenarse, eliminarse, y SHALL poder copiarse su
enlace directo. La creación SHALL resolverse siempre a través del componente de
alta rico definido por la capacidad `alta-de-tareas` —con título, descripción y
accesos a fecha, prioridad, fecha límite y proyecto destino—: este requisito no
repite esos campos, solo exige que crear una tarea pase por ese componente y
quede con al menos un título.

#### Scenario: Crear una tarea desde el componente de alta

- **WHEN** se confirma la creación de una tarea desde el componente de alta
  definido por `alta-de-tareas`, indicando al menos un título
- **THEN** la tarea queda creada, pendiente, en el proyecto de destino indicado
  (o en la Bandeja de entrada si no se indicó ninguno)

#### Scenario: Editar los campos de una tarea

- **WHEN** se edita el título, la descripción, la prioridad, la fecha de
  vencimiento, la duración estimada o la fecha límite de una tarea existente
- **THEN** la tarea queda actualizada con los nuevos valores

#### Scenario: Completar y descompletar una tarea

- **WHEN** se marca una tarea pendiente como completada
- **THEN** su `completed_at` deja de ser `null`
- **WHEN** se descompleta esa misma tarea
- **THEN** su `completed_at` vuelve a ser `null`

#### Scenario: Mover una tarea de proyecto o de sección

- **WHEN** se mueve una tarea a otro proyecto, o a otra sección dentro del mismo
  proyecto
- **THEN** la tarea queda ubicada en el proyecto y la sección de destino

#### Scenario: Reordenar una tarea

- **WHEN** se cambia el orden de una tarea respecto de las demás tareas de su
  mismo contexto (misma sección o mismo nivel de subtareas)
- **THEN** la tarea queda en la nueva posición

#### Scenario: Eliminar una tarea

- **WHEN** se elimina una tarea que tiene subtareas
- **THEN** la tarea y todas sus subtareas se borran físicamente

#### Scenario: Copiar el enlace directo de una tarea

- **WHEN** se usa la acción "copiar enlace directo" sobre una tarea
- **THEN** se copia una URL que apunta a `app/(app)/tarea/[id]` con el `id` de esa
  tarea

### Requirement: Ruta de una tarea suelta y detalle en la app

Una tarea SHALL tener una ruta propia en `app/(app)/tarea/[id]`, servida a
pantalla completa y con su propio `<title>` de documento. Esta ruta SHALL ser el
destino de "copiar enlace directo" y de "abrir en ventana aparte". Dentro de la
app, el detalle de una tarea SHALL mostrarse como un modal centrado por encima
de la pantalla, salvo en teléfono, donde SHALL mostrarse a pantalla completa. El
título y la descripción del detalle SHALL autoguardarse, sin requerir una
acción explícita de guardado.

#### Scenario: La ruta de tarea suelta tiene su propio título de documento

- **WHEN** se navega directamente a `app/(app)/tarea/[id]` de una tarea
  determinada
- **THEN** la página se muestra a pantalla completa
- **AND** el `<title>` del documento corresponde a esa tarea

#### Scenario: Abrir en ventana aparte usa esa ruta

- **WHEN** se usa la acción "abrir en ventana aparte" sobre una tarea
- **THEN** se abre `app/(app)/tarea/[id]` con el `id` de esa tarea

#### Scenario: El detalle es un modal centrado en escritorio

- **WHEN** se abre el detalle de una tarea desde dentro de la app en una
  pantalla de escritorio
- **THEN** se muestra como un modal centrado por encima de la pantalla, sin
  ningún control para redimensionarlo

#### Scenario: El detalle es pantalla completa en teléfono

- **WHEN** se abre el detalle de una tarea desde dentro de la app en una pantalla
  de teléfono
- **THEN** se muestra a pantalla completa, no como modal

#### Scenario: Título y descripción se autoguardan

- **WHEN** se edita el título o la descripción de una tarea desde el modal de
  detalle, sin usar ningún botón de guardar
- **THEN** el cambio queda persistido
