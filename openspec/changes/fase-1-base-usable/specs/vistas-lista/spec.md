## ADDED Requirements

### Requirement: Vistas de fase 1 en modo lista únicamente
La fase 1 SHALL ofrecer únicamente las vistas Bandeja de entrada, Hoy, Proyecto y Completado, y todas SHALL renderizarse en modo lista. La vista Próximos, el modo panel, la vista de calendario y la barra de opciones de vista pertenecen a fases posteriores y no existen en fase 1. El orden de las tareas dentro de cualquiera de estas cuatro vistas SHALL ser el manual definido por el campo `position`, sin agrupación ni filtros de vista.

#### Scenario: Sin vista Próximos, modo panel, calendario ni barra de opciones de vista
- **WHEN** un usuario navega la aplicación en fase 1
- **THEN** ningún punto de la interfaz ofrece acceder a una vista Próximos
- **AND** ninguna de las cuatro vistas ofrece cambiar a modo panel o a modo calendario
- **AND** ninguna de las cuatro vistas muestra una barra de opciones de vista

#### Scenario: Orden manual sin agrupación
- **WHEN** una de las cuatro vistas de lista muestra sus tareas
- **THEN** el orden SHALL ser el definido por el campo `position` de cada tarea
- **AND** la vista NO agrupa las tareas por prioridad, etiqueta ni ningún otro criterio
- **AND** la vista no ofrece ningún control para cambiar el criterio de orden o de agrupamiento

### Requirement: Vista Hoy
La vista Hoy SHALL mostrar sus tareas en bloques, en este orden: primero las tareas atrasadas destacadas visualmente, después las tareas que vencen hoy, y por último, solo si el usuario activa esa opción, las tareas completadas del día. Los hábitos y los eventos de calendario que menciona `docs/product-spec.md` para esta vista pertenecen a las fases 3 y 4 y no aparecen en fase 1. El botón de agregar tarea de esta vista SHALL precargar la fecha de hoy.

#### Scenario: Orden de bloques en Hoy
- **WHEN** el usuario abre la vista Hoy y tiene tareas atrasadas y tareas que vencen hoy
- **THEN** la vista muestra primero el bloque de tareas atrasadas, destacado visualmente
- **AND** a continuación muestra el bloque de tareas que vencen hoy
- **AND** si el usuario activa la opción de ver completadas, el bloque de tareas completadas del día aparece al final

#### Scenario: Hoy no incluye hábitos ni eventos
- **WHEN** el usuario abre la vista Hoy en fase 1
- **THEN** la vista no muestra ningún bloque de hábitos
- **AND** la vista no muestra ningún bloque de eventos de calendario

#### Scenario: Alta rápida desde Hoy precarga la fecha
- **WHEN** el usuario abre el formulario de agregar tarea desde la vista Hoy
- **THEN** el campo de fecha de vencimiento llega precargado con la fecha de hoy

### Requirement: Vista Proyecto
La vista Proyecto SHALL mostrar primero las tareas que no pertenecen a ninguna sección, y después cada sección como un bloque colapsable, cada uno con su propio botón para agregar una tarea dentro de esa sección.

#### Scenario: Orden dentro de un proyecto con secciones
- **WHEN** el usuario abre la vista de un proyecto que tiene tareas sin sección y al menos una sección con tareas
- **THEN** la vista muestra primero el bloque de tareas sin sección
- **AND** después muestra cada sección como un bloque colapsable
- **AND** cada sección tiene su propio botón para agregar una tarea dentro de ella

### Requirement: Vista Completado
La vista Completado SHALL mostrar una lista simple de las tareas completadas junto con un contador del total, y SHALL ofrecer, para cada tarea, la acción de volver a marcarla como pendiente.

#### Scenario: Contador y vuelta a pendiente
- **WHEN** el usuario abre la vista Completado y tiene al menos una tarea completada
- **THEN** la vista muestra la lista de tareas completadas junto con un contador del total
- **AND** cada tarea completada ofrece una acción para volver a marcarla como pendiente

### Requirement: Vista Bandeja de entrada
La Bandeja de entrada SHALL mostrar únicamente las tareas que no tienen ningún proyecto asignado.

#### Scenario: Solo tareas sin proyecto
- **WHEN** una tarea no tiene proyecto asignado
- **THEN** la tarea aparece en la vista Bandeja de entrada
- **AND** una tarea que tiene proyecto asignado no aparece en la Bandeja de entrada

### Requirement: Contador de pendientes de Hoy solo cuenta tareas
El contador que acompaña el acceso a Hoy en la navegación SHALL contar únicamente tareas pendientes atrasadas o que vencen hoy. En fase 1 este contador NO SHALL incluir hábitos, aunque `docs/product-spec.md` describa un contador que suma tareas y hábitos: los hábitos son de fase 3 y todavía no existen.

#### Scenario: El contador ignora los hábitos
- **WHEN** el panel lateral o la barra inferior muestran el contador junto al acceso a Hoy
- **THEN** el número mostrado cuenta únicamente tareas pendientes atrasadas o que vencen hoy
- **AND** el número no incluye ningún hábito

### Requirement: Navegación de escritorio en fase 1
El panel lateral de escritorio SHALL ser colapsable a una versión angosta de solo íconos, y SHALL mostrar, de arriba a abajo: nombre y correo de la cuenta; los accesos principales Bandeja de entrada, Hoy con su contador y Completado; la lista de favoritos; el árbol de proyectos con la cantidad de tareas por proyecto y ramas colapsables; y al pie, cambiar tema, Configuración y cerrar sesión. Los accesos a Próximos, Hábitos, Etiquetas y Filtros no existen en fase 1.

#### Scenario: Contenido del panel lateral colapsable
- **WHEN** el usuario ve el panel lateral en escritorio
- **THEN** el panel muestra, de arriba a abajo, nombre y correo de la cuenta, los accesos principales Bandeja de entrada, Hoy con su contador y Completado, la lista de favoritos, el árbol de proyectos con cantidad de tareas por proyecto y ramas colapsables, y al pie cambiar tema, Configuración y cerrar sesión
- **AND** el usuario puede colapsar el panel a una versión angosta de solo íconos

#### Scenario: Accesos que no existen en fase 1
- **WHEN** el usuario ve el panel lateral en escritorio
- **THEN** el panel no muestra ningún acceso a Próximos, Hábitos, Etiquetas ni Filtros

### Requirement: Navegación móvil en fase 1
En teléfono, la aplicación SHALL mostrar una barra inferior con exactamente tres accesos: Bandeja de entrada, Hoy y Agregar. El cuarto lugar de la barra queda vacío a propósito: en el spec funcional completo ese lugar es para Próximos, pero Próximos es de fase 2, y rellenarlo con otra pantalla (por ejemplo Completado) acostumbraría a los usuarios a una posición que va a cambiar de contenido apenas llegue fase 2. El resto de las funciones, incluida Completado, se alcanza deslizando el panel lateral.

#### Scenario: Contenido de la barra inferior
- **WHEN** el usuario abre la aplicación en un teléfono
- **THEN** la barra inferior muestra únicamente los accesos Bandeja de entrada, Hoy y Agregar
- **AND** el cuarto lugar de la barra queda vacío, sin ningún acceso adicional
- **AND** ningún acceso de la barra inferior apunta a Próximos ni a Completado

### Requirement: Estados vacíos con guía y acción
Ninguna de las cuatro vistas SHALL mostrarse en blanco cuando no tiene contenido: cada estado vacío explica qué va a aparecer ahí y, salvo la vista Completado, ofrece la acción para empezar, con el tono directo y tranquilo de `.claude/rules/copy.md` — sin exclamaciones, sin emojis, sin motivación forzada.

#### Scenario: Bandeja de entrada vacía
- **WHEN** la Bandeja de entrada no tiene tareas
- **THEN** la vista muestra el texto "Tu bandeja de entrada está vacía."
- **AND** ofrece una acción para crear una tarea
- **AND** no se muestra una pantalla en blanco

#### Scenario: Hoy vacía
- **WHEN** la vista Hoy no tiene tareas atrasadas ni tareas que vencen hoy
- **THEN** la vista explica qué tareas van a aparecer ahí
- **AND** ofrece la acción de agregar una tarea con fecha de hoy

#### Scenario: Proyecto vacío
- **WHEN** un proyecto no tiene tareas ni secciones
- **THEN** la vista explica qué va a aparecer ahí
- **AND** ofrece la acción de agregar la primera tarea

#### Scenario: Completado vacío
- **WHEN** no hay tareas completadas
- **THEN** la vista explica que ahí van a aparecer las tareas que se completen
- **AND** ofrece una acción para ir a las tareas pendientes

### Requirement: Fechas en lenguaje natural en las vistas de lista
Cuando una tarea vence en menos de siete días, las vistas de lista SHALL mostrar su fecha en lenguaje natural ("hoy", "mañana", "el martes") antes que en formato numérico. A partir de siete días, la vista SHALL mostrar la fecha en formato numérico según la preferencia del usuario.

#### Scenario: Fecha a menos de siete días en lenguaje natural
- **WHEN** una tarea vence hoy, mañana, o en cualquier día dentro de los próximos siete días
- **THEN** la vista de lista muestra la fecha en lenguaje natural en lugar de la fecha numérica

#### Scenario: Fecha a siete días o más en formato numérico
- **WHEN** una tarea vence en siete días o más
- **THEN** la vista muestra la fecha en formato numérico, según la preferencia de formato de fecha del usuario
