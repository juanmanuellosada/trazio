## ADDED Requirements

### Requirement: El modo panel está disponible en Bandeja, Proyecto y Próximos

El modo panel SHALL estar disponible como forma de ver alternativa a la lista únicamente en las vistas Bandeja de entrada, Proyecto y Próximos. El modo calendario queda explícitamente fuera de alcance de esta capacidad: es fase 4.

#### Scenario: El selector de forma de ver ofrece panel en Bandeja

- **WHEN** el usuario abre la barra de opciones de vista en la Bandeja de
  entrada
- **THEN** el selector de forma de ver ofrece "lista" y "panel"
- **AND** no ofrece "calendario"

#### Scenario: El modo panel no existe fuera de esas tres vistas

- **WHEN** el usuario abre la barra de opciones de vista en Hoy, en la
  página de una etiqueta o en la página de un filtro
- **THEN** el selector de forma de ver no ofrece la opción "panel"

### Requirement: Las columnas del panel son las secciones en Bandeja y Proyecto

En Bandeja de entrada y en Proyecto, el modo panel SHALL mostrar una columna por sección, incluida una columna para las tareas sin sección.

#### Scenario: Un proyecto con dos secciones muestra tres columnas

- **WHEN** un proyecto tiene las secciones "En curso" y "Bloqueado", y
  además tareas sin sección
- **THEN** el modo panel de ese proyecto muestra tres columnas: la de
  tareas sin sección, "En curso" y "Bloqueado"

### Requirement: Las columnas del panel son los días en Próximos

En Próximos, el modo panel SHALL mostrar una columna por cada día dentro de la ventana configurada, más una columna "Sin fecha".

#### Scenario: Una ventana de 7 días muestra 8 columnas

- **WHEN** Próximos está configurado con la ventana por defecto de 7 días
- **THEN** el modo panel muestra 7 columnas de día más la columna "Sin
  fecha", 8 en total

#### Scenario: La columna "Sin fecha" muestra las tareas que la lista excluye

- **WHEN** una tarea no tiene fecha de vencimiento asignada
- **THEN** en modo panel de Próximos esa tarea aparece en la columna "Sin
  fecha"
- **AND** en modo lista de Próximos esa misma tarea no aparece en ningún
  grupo, según ya establece `vista-proximos`

### Requirement: Arrastrar entre columnas cambia sección o fecha, pero no es la única forma

Arrastrar una tarea a otra columna SHALL cambiarle la sección (en Bandeja y Proyecto) o la fecha de vencimiento (en Próximos, incluida la columna "Sin fecha", que la deja sin fecha). Por D24, el arrastre entre columnas MUST NOT ser la única forma de mover una tarea de sección o de cambiarle la fecha: ambas acciones SHALL seguir disponibles desde el menú contextual de la tarea.

#### Scenario: Arrastrar una tarea a otra sección la mueve

- **WHEN** el usuario arrastra una tarea desde la columna "En curso" hasta
  la columna "Bloqueado" en el modo panel de un proyecto
- **THEN** la tarea queda asignada a la sección "Bloqueado"

#### Scenario: Arrastrar una tarea a otra columna de día le cambia la fecha

- **WHEN** el usuario arrastra una tarea desde la columna de "Hoy" hasta la
  columna de "Mañana" en el modo panel de Próximos
- **THEN** la fecha de vencimiento de la tarea pasa a ser la de mañana

#### Scenario: Cambiar de sección sin arrastrar sigue siendo posible

- **WHEN** el usuario abre el menú contextual de una tarea en modo panel y
  elige mover a otra sección
- **THEN** la tarea cambia de sección
- **AND** el usuario no necesitó arrastrarla para lograrlo

#### Scenario: Cambiar la fecha sin arrastrar sigue siendo posible

- **WHEN** el usuario abre el menú contextual de una tarea en el modo panel
  de Próximos y le cambia la fecha desde ahí
- **THEN** la tarea cambia de columna según la nueva fecha
- **AND** el usuario no necesitó arrastrarla para lograrlo

### Requirement: El arrastre entre columnas solo está habilitado con orden manual y sin agrupación

Arrastrar una tarea entre columnas del modo panel SHALL estar habilitado únicamente cuando el orden configurado es manual y no hay ninguna agrupación activa, la misma condición que ya rige el arrastre en el modo lista.

#### Scenario: Con agrupación activa, el arrastre entre columnas está deshabilitado

- **WHEN** el modo panel de un proyecto tiene activada la agrupación por
  prioridad
- **THEN** arrastrar una tarea de una columna a otra no produce ningún
  cambio de sección

#### Scenario: Con orden por fecha, el arrastre entre columnas está deshabilitado

- **WHEN** el modo panel de Próximos tiene configurado el orden por fecha
  en vez de manual
- **THEN** arrastrar una tarea de una columna de día a otra no le cambia la
  fecha
