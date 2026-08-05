# vistas-lista Specification

## Purpose
TBD - created by archiving change fase-1-base-usable. Update Purpose after archive.
## Requirements
### Requirement: Formas de ver y barra de opciones en las vistas de fase 1

Bandeja de entrada, Hoy, Proyecto y Completado SHALL seguir siendo las cuatro
vistas de esta capacidad, y SHALL renderizarse en modo lista por defecto.
Bandeja de entrada, Hoy y Proyecto SHALL ofrecer también modo panel y modo
calendario como alternativas, según definen las capacidades `modo-panel`,
`opciones-de-vista` y, en el caso de Hoy, `hoy-con-eventos`; Completado SHALL
seguir renderizándose únicamente en modo lista. Bandeja de entrada, Hoy y
Proyecto SHALL mostrar la barra de opciones de vista que define la capacidad
`opciones-de-vista`, desde donde pasan a controlarse el orden, la
agrupación, qué mostrar y el resto de sus opciones; Completado SHALL seguir
sin esa barra. Por decisión D25, el orden por defecto —antes de que el usuario
cambie nada desde la barra de opciones, donde exista— sigue siendo manual
por `position` en Bandeja de entrada y Proyecto, por hora en Hoy y por fecha
de completado descendente en Completado.

#### Scenario: Modo panel y calendario disponibles en Bandeja de entrada, Hoy y Proyecto

- **WHEN** un usuario abre Bandeja de entrada, Hoy o Proyecto
- **THEN** esa vista ofrece cambiar a modo panel
- **AND** esa vista ofrece cambiar a modo calendario

#### Scenario: Completado sigue solo en modo lista

- **WHEN** un usuario abre Completado
- **THEN** esa vista no ofrece cambiar a modo panel
- **AND** esa vista no ofrece cambiar a modo calendario

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

### Requirement: Vista Hoy

La vista Hoy SHALL mostrar sus bloques en este orden: primero las tareas atrasadas destacadas visualmente, después **una sola secuencia con las tareas que vencen hoy y los eventos de calendario de hoy intercalados**, después el bloque de hábitos del día con un contador de cuántos se marcaron, y por último, solo si el usuario activa esa opción, las tareas completadas del día. El botón de agregar tarea de esta vista SHALL precargar la fecha de hoy.

Los eventos de calendario NUNCA SHALL mostrarse en un bloque propio al final: el orden dentro de la secuencia y el tratamiento de cada fila los define la capacidad `hoy-con-eventos`.

#### Scenario: Orden de bloques en Hoy

- **WHEN** el usuario abre la vista Hoy y tiene tareas atrasadas, tareas que vencen hoy, hábitos programados para hoy y eventos de calendario de hoy
- **THEN** la vista muestra primero el bloque de tareas atrasadas, destacado visualmente
- **AND** a continuación muestra una sola secuencia con las tareas que vencen hoy y los eventos de hoy intercalados
- **AND** a continuación muestra el bloque de hábitos del día, con un contador de cuántos se marcaron
- **AND** si el usuario activa la opción de ver completadas, el bloque de tareas completadas del día aparece al final

#### Scenario: Los eventos de hoy no tienen bloque propio

- **WHEN** el usuario abre la vista Hoy y tiene al menos un evento de calendario para hoy
- **THEN** los eventos SHALL aparecer dentro de la secuencia de tareas de hoy
- **AND** NUNCA SHALL aparecer un bloque de eventos separado al final de la vista

#### Scenario: Alta rápida desde Hoy precarga la fecha

- **WHEN** el usuario abre el formulario de agregar tarea desde la vista Hoy
- **THEN** el campo de fecha de vencimiento llega precargado con la fecha de hoy

### Requirement: Vista Proyecto

La vista Proyecto SHALL mostrar sus tareas según el agrupador activo. Agrupada por sección —su valor por defecto— SHALL mostrar primero las tareas que no pertenecen a ninguna sección, y después cada sección como un bloque colapsable, cada uno con su propio botón para agregar una tarea dentro de esa sección.

Con cualquier otro agrupador, incluida la opción de no agrupar, la vista SHALL mostrar las tareas sin los bloques de sección. En ese caso las acciones que viven en el encabezado de una sección —renombrarla, eliminarla, crear una nueva— SHALL seguir siendo alcanzables desde otro lado, según exige **D24**. Colapsar SHALL poder perderse, porque es una comodidad de lectura y no una acción sobre los datos.

#### Scenario: Orden dentro de un proyecto agrupado por sección

- **WHEN** el usuario abre la vista de un proyecto que tiene tareas sin sección y al menos una sección con tareas
- **THEN** la vista muestra primero el bloque de tareas sin sección
- **AND** después muestra cada sección como un bloque colapsable
- **AND** cada sección tiene su propio botón para agregar una tarea dentro de ella

#### Scenario: Un proyecto sin agrupar se ve como una lista corrida

- **WHEN** el usuario elige no agrupar en un proyecto con secciones
- **THEN** SHALL ver una sola lista corrida
- **AND** NUNCA SHALL verse un encabezado de sección

#### Scenario: Administrar secciones sigue siendo posible sin los bloques

- **WHEN** el usuario está en un proyecto con un agrupador distinto de sección
- **THEN** crear, renombrar y eliminar una sección SHALL seguir siendo alcanzable

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

El contador que acompaña el acceso a Hoy en la navegación SHALL contar tareas pendientes atrasadas o que vencen hoy, más los hábitos pendientes de hoy —los que tocan hoy y todavía no fueron marcados—, sumando ambos en un solo número.

NUNCA SHALL contar eventos de calendario, aunque la vista Hoy los muestre. Un evento no se completa, así que un contador que los incluyera nunca bajaría a cero en un día con reuniones.

#### Scenario: El contador suma tareas y hábitos pendientes de hoy

- **WHEN** el panel lateral o la barra inferior muestran el contador junto al acceso a Hoy
- **THEN** el número mostrado es la suma de las tareas pendientes atrasadas o que vencen hoy, más los hábitos que tocan hoy y todavía no fueron marcados

#### Scenario: Un evento no incrementa el contador

- **WHEN** el usuario tiene un evento hoy y ninguna tarea ni hábito pendiente
- **THEN** el contador de Hoy NUNCA SHALL contar ese evento

### Requirement: Navegación de escritorio en fase 1

El panel lateral de escritorio SHALL ser colapsable a una versión angosta de
solo íconos mediante un control de colapsar distinguible del resto de los
accesos, y SHALL mostrar, de arriba a abajo: nombre y correo de la cuenta; el
botón de agregar tarea; los accesos principales Bandeja de entrada, Hoy con
su contador y Completado; la lista de favoritos; el árbol de proyectos con la
cantidad de tareas por proyecto y ramas colapsables; y al pie, un menú de
cuenta que agrupa cambiar tema, Configuración y cerrar sesión, en vez de
mostrarlos sueltos. Los accesos a Próximos, Hábitos, Etiquetas y Filtros no
existen en fase 1.

#### Scenario: Contenido del panel lateral colapsable

- **WHEN** el usuario ve el panel lateral en escritorio
- **THEN** el panel muestra, de arriba a abajo, nombre y correo de la cuenta,
  el botón de agregar tarea, los accesos principales Bandeja de entrada, Hoy
  con su contador y Completado, la lista de favoritos, el árbol de proyectos
  con cantidad de tareas por proyecto y ramas colapsables, y al pie un menú
  de cuenta que agrupa cambiar tema, Configuración y cerrar sesión
- **AND** el usuario puede colapsar el panel a una versión angosta de solo
  íconos usando un control de colapsar distinguible del resto de los accesos

#### Scenario: El botón de agregar tarea abre el componente de alta

- **WHEN** el usuario hace clic en el botón de agregar tarea del panel
  lateral
- **THEN** se abre el componente de alta de tareas

#### Scenario: Las opciones de cuenta están agrupadas en un menú, no sueltas en el pie

- **WHEN** el usuario abre el menú de cuenta del pie del panel lateral
- **THEN** el menú muestra juntas las opciones de cambiar tema, Configuración
  y cerrar sesión
- **AND** ninguna de esas tres opciones aparece suelta fuera del menú

#### Scenario: Accesos que no existen en fase 1

- **WHEN** el usuario ve el panel lateral en escritorio
- **THEN** el panel no muestra ningún acceso a Próximos, Hábitos, Etiquetas
  ni Filtros

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

### Requirement: Ancho de contenido adaptativo en las vistas de lista

El ancho de la columna de contenido de las vistas de lista SHALL crecer junto
con el ancho de la ventana hasta un tope máximo, en vez de detenerse en un
ancho fijo angosto. La fecha, la prioridad y las etiquetas de una tarea SHALL
acompañar al título en vez de fijarse al borde derecho del contenedor.

El proyecto y la sección de una tarea SHALL ser la **única excepción**: cuando se muestran,
van anclados al borde derecho de la fila. La excepción se justifica porque no se leen en la
misma pasada que el título —se consultan cuando uno quiere saber de dónde viene la tarea— y
porque anclarlos alinea ese dato entre filas, que es lo que lo vuelve recorrible.

Por encima de un umbral de
ancho disponible, la columna de contenido SHALL centrarse en el espacio que
le queda al panel lateral, de forma que los márgenes se lean como aire; por
debajo de ese umbral, SHALL quedar alineada a la izquierda, pegada al panel
lateral, como hasta ahora. El valor concreto del tope máximo, el umbral de
centrado y el comportamiento intermedio los define la skill de diseño
`ui-ux-pro-max`; este requisito fija el comportamiento, no un número.

#### Scenario: El contenido usa más ancho en una pantalla amplia

- **WHEN** la ventana tiene un ancho de escritorio amplio
- **THEN** el ancho de la columna de contenido de la vista SHALL ser mayor
  que en una pantalla angosta, hasta el tope máximo definido por el sistema
  de diseño
- **AND** el ancho SHALL NOT quedar detenido en el valor fijo angosto
  anterior

#### Scenario: La fecha y las etiquetas acompañan al título

- **WHEN** se muestra una tarea con fecha y etiquetas en una pantalla ancha
- **THEN** SHALL mostrarse a una distancia acotada del título
- **AND** NUNCA SHALL mostrarse pegadas al borde derecho con un espacio vacío grande entre el
  título y ellas

#### Scenario: El proyecto sí se ancla al borde derecho

- **WHEN** se muestra una tarea en una vista que cruza proyectos, en una pantalla ancha
- **THEN** el proyecto y la sección SHALL mostrarse anclados al borde derecho de la fila
- **AND** SHALL quedar alineados con los de las demás filas

#### Scenario: El contenido se centra por encima del umbral de ancho

- **WHEN** el ancho disponible para la columna de contenido supera el
  umbral que define la skill de diseño
- **THEN** la columna de contenido se centra en el espacio disponible junto
  al panel lateral

### Requirement: Selección múltiple en Bandeja de entrada, Hoy y Proyecto

Bandeja de entrada, Hoy y Proyecto SHALL ofrecer selección múltiple de
tareas, con la barra de acciones en lote que define la capacidad
`seleccion-multiple`. Completado NUNCA SHALL ofrecer selección múltiple en
esta fase.

Los eventos de calendario NUNCA SHALL entrar en la selección múltiple de Hoy: las acciones en lote son de tarea, y ninguna se aplica a un evento.

#### Scenario: Selección múltiple disponible en Bandeja de entrada, Hoy y Proyecto

- **WHEN** un usuario activa selección múltiple en Bandeja de entrada, Hoy o Proyecto
- **THEN** puede marcar más de una tarea a la vez
- **AND** aparece la barra de acciones en lote

#### Scenario: Completado no ofrece selección múltiple

- **WHEN** un usuario abre Completado
- **THEN** no existe ningún casillero de selección múltiple en esa vista

#### Scenario: Un evento no se puede seleccionar

- **WHEN** un usuario activa selección múltiple en Hoy y la lista tiene eventos
- **THEN** NUNCA SHALL verse un casillero de selección en la fila de un evento

### Requirement: La fila de tarea se organiza en niveles

La fila de una tarea SHALL organizarse en dos niveles: el título con el proyecto y la sección
anclados a la derecha, y debajo la fecha y las etiquetas.

Cada nivel SHALL renderizarse **solo si tiene contenido**. Una tarea sin fecha ni etiquetas
NUNCA SHALL reservar un renglón vacío: SHALL ocupar una sola línea.

#### Scenario: Una tarea con fecha y etiquetas ocupa dos niveles

- **WHEN** se muestra una tarea que tiene fecha y al menos una etiqueta
- **THEN** el título SHALL estar en un nivel y la fecha con las etiquetas en el siguiente

#### Scenario: Una tarea sin fecha ni etiquetas ocupa una sola línea

- **WHEN** se muestra una tarea sin fecha y sin etiquetas
- **THEN** SHALL ocupar una sola línea
- **AND** NUNCA SHALL dejar un renglón vacío debajo del título

### Requirement: El proyecto se muestra solo donde la vista cruza proyectos

El proyecto y la sección de una tarea SHALL mostrarse únicamente en las vistas cuyas tareas
pueden venir de proyectos distintos: Hoy, Próximos, la página de una etiqueta, la de un filtro,
el buscador y Completado.

NUNCA SHALL mostrarse en la Bandeja de entrada, en un proyecto, dentro de una sección ni en las
subtareas del detalle: ahí repetiría en cada fila lo que el encabezado ya dice.

Esta condición SHALL decidirse explícitamente en cada vista, y NUNCA SHALL derivarse del
tratamiento visual de la fila: hay vistas con el tratamiento compacto —el tablero de un
proyecto, y agrupar por prioridad dentro de un proyecto— donde el proyecto igual sobra.

#### Scenario: En Hoy se ve de qué proyecto es cada tarea

- **WHEN** el usuario mira Hoy, con tareas de proyectos distintos
- **THEN** cada fila SHALL mostrar su proyecto y, si la tiene, su sección

#### Scenario: Dentro de un proyecto no se repite el proyecto

- **WHEN** el usuario mira un proyecto
- **THEN** NUNCA SHALL mostrarse el proyecto en las filas

#### Scenario: Agrupar por prioridad dentro de un proyecto tampoco lo muestra

- **WHEN** el usuario agrupa por prioridad dentro de un proyecto, lo que cambia el tratamiento
  visual de la fila
- **THEN** NUNCA SHALL mostrarse el proyecto en las filas

### Requirement: Separación entre tareas y entre secciones

Las tareas hermanas de una lista SHALL separarse con una línea, y las secciones con una línea
**más marcada**, de modo que la jerarquía se lea sin esfuerzo.

NUNCA SHALL dibujarse una línea debajo de la última tarea de una lista, ni entre subtareas: en
el primer caso no separa nada, y en el segundo la sangría ya comunica el anidamiento y las
líneas harían parecer hermanas a tareas que no lo son.

#### Scenario: Las tareas de una lista se separan entre sí

- **WHEN** el usuario mira una lista con varias tareas
- **THEN** SHALL verse una línea entre una tarea y la siguiente

#### Scenario: La última tarea no lleva línea

- **WHEN** el usuario mira la última tarea de una lista
- **THEN** NUNCA SHALL dibujarse una línea debajo de ella

#### Scenario: Las subtareas no llevan línea

- **WHEN** el usuario expande una tarea con subtareas
- **THEN** NUNCA SHALL dibujarse líneas entre las subtareas

#### Scenario: La separación de sección se distingue de la de tarea

- **WHEN** el usuario mira una lista con secciones y tareas
- **THEN** la línea que separa secciones SHALL leerse como más marcada que la que separa tareas

### Requirement: La lista de Hoy no se agrupa

La lista de Hoy NUNCA SHALL ofrecer el control de agrupar por: dejó de ser una lista de tareas y pasó a ser una secuencia ordenada por hora con eventos intercalados, que define la capacidad `hoy-con-eventos`.

Agrupar romperia esa secuencia, y además los eventos no tienen prioridad, ni etiqueta, ni sección por las que agruparlos.

El panel de Hoy SHALL seguir ofreciendo el agrupador, porque ahí no hay eventos ni secuencia que romper.

#### Scenario: Hoy en lista no ofrece agrupar

- **WHEN** el usuario abre la barra de opciones de Hoy en la forma de ver "lista"
- **THEN** NUNCA SHALL ver el control de agrupar por

#### Scenario: Hoy en panel sí ofrece agrupar

- **WHEN** el usuario abre la barra de opciones de Hoy en la forma de ver "panel"
- **THEN** SHALL ver el control de agrupar por

