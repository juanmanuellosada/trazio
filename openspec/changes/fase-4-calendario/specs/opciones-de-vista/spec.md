## MODIFIED Requirements

### Requirement: Forma de ver, solo donde existe modo panel

La barra SHALL ofrecer un selector de forma de ver con los valores "lista", "panel" y "calendario" únicamente en las pantallas donde `modo-panel` está disponible (Bandeja, Proyecto y Próximos). En Hoy, Etiqueta y Filtro, donde no hay modo panel, la barra MUST NOT mostrar el selector de forma de ver.

#### Scenario: El selector aparece en Proyecto

- **WHEN** el usuario abre la barra de opciones de vista de un proyecto
- **THEN** ve un selector de forma de ver con los valores "lista", "panel" y "calendario"

#### Scenario: El selector no aparece en Hoy

- **WHEN** el usuario abre la barra de opciones de vista de Hoy
- **THEN** no ve ningún selector de forma de ver

#### Scenario: Calendario es una forma de ver posible

- **WHEN** el usuario abre el selector de forma de ver en Bandeja, Proyecto o Próximos
- **THEN** "calendario" aparece como una de las opciones, junto a "lista" y "panel"

### Requirement: Los controles de hábitos y repeticiones futuras quedan reservados, sin exponerse

La clave de opción para mostrar repeticiones futuras de una tarea recurrente SHALL exponerse como control interactivo en la barra únicamente cuando la forma de ver activa es "calendario": ahí controla si se dibujan, como bloques de vista previa no interactivos, las ocurrencias futuras de una tarea recurrente dentro del rango visible. En las demás formas de ver, la barra MUST NOT mostrar este control. La clave de opción para mostrar hábitos SHALL seguir exponiéndose como control interactivo en la barra, en las pantallas donde la barra existe.

#### Scenario: El control de repeticiones futuras se muestra en forma de ver calendario

- **WHEN** el usuario cambia la forma de ver a "calendario"
- **THEN** ve un control para mostrar u ocultar las repeticiones futuras de tareas recurrentes

#### Scenario: El control de repeticiones futuras no aparece en lista ni en panel

- **WHEN** la forma de ver activa es "lista" o "panel"
- **THEN** no aparece ningún control para repeticiones futuras

#### Scenario: El control de mostrar hábitos es visible

- **WHEN** el usuario abre la barra de opciones de vista
- **THEN** ve un control para mostrar u ocultar hábitos

### Requirement: Una clave desconocida en el `jsonb` se ignora

Si el `jsonb` de opciones de una pantalla contiene una clave que el sistema no reconoce, esa clave SHALL ignorarse al leer, sin impedir que el resto de las opciones válidas se aplique ni romper la vista. `formato_calendario` dejó de ser un ejemplo de clave desconocida: desde esta fase es una clave válida, consumida por el control de formato de calendario.

#### Scenario: Una clave vieja o inválida no rompe la vista

- **WHEN** la fila de `view_preferences` de un proyecto contiene una clave `orden_experimental` que ya no es válida, junto con un `orden` válido
- **THEN** la vista se muestra usando el `orden` guardado
- **AND** la vista no falla ni muestra un error por la clave desconocida

## ADDED Requirements

### Requirement: Formato de calendario, solo cuando la forma de ver es calendario

La barra SHALL ofrecer el control "formato de calendario", con los valores día, cuatro días, semana y mes, únicamente cuando la forma de ver activa es "calendario". Las demás formas de ver MUST NOT mostrar este control.

#### Scenario: El control aparece solo con la forma de ver calendario

- **WHEN** el usuario cambia la forma de ver a "calendario" en Bandeja, Proyecto o Próximos
- **THEN** la barra de opciones de vista muestra el control de formato de calendario con los valores día, cuatro días, semana y mes

#### Scenario: El control no aparece en lista ni en panel

- **WHEN** la forma de ver activa es "lista" o "panel"
- **THEN** la barra de opciones de vista no muestra el control de formato de calendario
