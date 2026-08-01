# opciones-de-vista Specification

## Purpose
TBD - created by archiving change fase-2-potencia. Update Purpose after archive.
## Requirements
### Requirement: La barra de opciones de vista está presente en seis pantallas

La barra de opciones de vista SHALL presentarse en Bandeja de entrada, Hoy, Próximos, Proyecto, la página de una Etiqueta y la página de un Filtro como un único disparador en la cabecera que abre un panel agrupado en las secciones Vista (forma de ver, el formato de calendario cuando corresponde, y los interruptores de completadas y de hábitos), Orden (agrupar por, ordenar por) y Filtro (fecha límite, prioridad, etiqueta), con el botón de restablecer al pie del panel.

#### Scenario: El disparador aparece en las seis pantallas

- **WHEN** el usuario abre, una por una, la Bandeja de entrada, Hoy,
  Próximos, un Proyecto, la página de una Etiqueta y la página de un
  Filtro
- **THEN** cada una de esas seis pantallas muestra el disparador de
  opciones de vista

#### Scenario: El disparador abre un panel agrupado en tres secciones

- **WHEN** el usuario abre el disparador de opciones de vista
- **THEN** ve un panel con las secciones Vista, Orden y Filtro
- **AND** el selector de forma de ver está dentro de la sección Vista, no
  suelto en la cabecera

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

### Requirement: Mostrar u ocultar tareas completadas

La barra SHALL ofrecer un control para mostrar u ocultar las tareas completadas de la pantalla actual.

#### Scenario: Ocultar completadas las saca de la vista

- **WHEN** el usuario desactiva "mostrar completadas" en la Bandeja de
  entrada
- **THEN** las tareas completadas dejan de listarse ahí
- **AND** al reactivar la opción, vuelven a aparecer

### Requirement: Cuántos días adelante mostrar, solo en Próximos

La barra SHALL ofrecer el control "cuántos días adelante mostrar" únicamente en la vista Próximos, donde configura el tamaño de la ventana que define `vista-proximos`. Las demás pantallas MUST NOT mostrar este control.

#### Scenario: El control aparece solo en Próximos

- **WHEN** el usuario compara la barra de opciones de vista de Próximos
  contra la de la Bandeja de entrada
- **THEN** solo la de Próximos muestra el control "cuántos días adelante
  mostrar"

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

### Requirement: Orden configurable

La barra SHALL ofrecer un control de orden con los valores manual, por nombre, por fecha y por prioridad.

#### Scenario: Cambiar el orden a "por prioridad"

- **WHEN** el usuario elige "por prioridad" en el control de orden de un
  proyecto
- **THEN** las tareas de esa vista se reordenan de mayor a menor prioridad

### Requirement: Agrupar por, configurable

La barra SHALL ofrecer un control de agrupación con los valores nada, prioridad y etiqueta.

#### Scenario: Agrupar por etiqueta

- **WHEN** el usuario elige "etiqueta" en el control de agrupar por, en
  una vista donde algunas tareas comparten etiquetas y otras no tienen
  ninguna
- **THEN** las tareas se muestran agrupadas por cada etiqueta que tienen
  asignada
- **AND** las tareas sin ninguna etiqueta se agrupan aparte

### Requirement: Filtrar por fecha límite, prioridad y etiqueta

La barra SHALL ofrecer filtros rápidos por fecha límite, por prioridad y por etiqueta, combinables entre sí.

#### Scenario: Filtrar por prioridad Urgente

- **WHEN** el usuario filtra por prioridad "Urgente" en la Bandeja de
  entrada
- **THEN** la vista muestra únicamente las tareas con prioridad Urgente

#### Scenario: Combinar dos filtros rápidos

- **WHEN** el usuario filtra por prioridad "Urgente" y además por la
  etiqueta `Trabajo`
- **THEN** la vista muestra únicamente las tareas que cumplen ambas
  condiciones a la vez

### Requirement: Botón para restablecer

La barra SHALL ofrecer un botón que restablece todas sus opciones a los valores por defecto de la pantalla actual.

#### Scenario: Restablecer devuelve los defaults de esa pantalla

- **WHEN** el usuario cambió el orden, la agrupación y un filtro en un
  proyecto, y presiona "restablecer"
- **THEN** el orden, la agrupación y los filtros de ese proyecto vuelven a
  sus valores por defecto
- **AND** las opciones de otras pantallas no se ven afectadas

### Requirement: Persistencia por pantalla en `view_preferences`

Cada pantalla SHALL recordar sus propias opciones, persistidas en la tabla `view_preferences` bajo su propia clave `view_key` (`bandeja`, `hoy`, `proximos`, `proyecto:<id>`, `etiqueta:<id>` o `filtro:<id>`), sin mezclarse con las de ninguna otra pantalla.

#### Scenario: Cada pantalla tiene sus propias opciones

- **WHEN** el usuario agrupa por prioridad en el proyecto "Casa" y agrupa
  por etiqueta en el proyecto "Trabajo"
- **THEN** al volver a abrir "Casa", sigue agrupado por prioridad
- **AND** al abrir "Trabajo", sigue agrupado por etiqueta

### Requirement: Las opciones se sincronizan entre dispositivos

Las opciones de vista SHALL sincronizarse entre dispositivos: al abrir la misma pantalla desde otro dispositivo con la misma cuenta, se aplican las mismas opciones guardadas.

#### Scenario: La misma cuenta ve las mismas opciones en otro dispositivo

- **WHEN** el usuario configura el orden por fecha en Próximos desde su
  computadora, y luego abre Próximos desde su teléfono con la misma cuenta
- **THEN** Próximos se muestra ordenado por fecha también en el teléfono

### Requirement: Los defaults de D25 se aplican a lo que falte

Al leer las opciones de una pantalla, cualquier clave ausente en el `jsonb` SHALL completarse con su valor por defecto: Hoy ordena por hora, Completado por fecha de completado descendente, y Bandeja y Proyecto por orden manual.

#### Scenario: Sin preferencia guardada, Hoy usa el default de hora

- **WHEN** un usuario abre Hoy por primera vez, sin ninguna fila en
  `view_preferences` para la clave `hoy`
- **THEN** la vista se muestra ordenada por hora, sin que el usuario haya
  configurado nada

#### Scenario: Sin preferencia guardada, Completado usa el default de fecha de completado

- **WHEN** un usuario abre Completado por primera vez, sin ninguna fila en
  `view_preferences` para la clave `completado`
- **THEN** la vista se muestra ordenada por fecha de completado, de la más
  reciente a la más antigua

### Requirement: Los defaults de Próximos, Etiqueta y Filtro

Al leer las opciones de una pantalla sin preferencia guardada, Próximos SHALL ordenar por fecha de vencimiento ascendente, con las tareas que tienen hora antes que las que no la tienen dentro de un mismo día, ordenadas por hora ascendente, y a igualdad de fecha y hora SHALL desempatar por prioridad descendente; Etiqueta y Filtro SHALL ordenar por fecha de vencimiento ascendente con las tareas sin fecha al final, y a igualdad de fecha SHALL desempatar por prioridad descendente.

#### Scenario: Sin preferencia guardada, Próximos ordena por fecha, hora y prioridad

- **WHEN** un usuario abre Próximos por primera vez, sin ninguna fila en
  `view_preferences` para la clave `proximos`, con tareas que vencen el mismo
  día, algunas con hora y otras sin hora
- **THEN** las tareas se ordenan primero por fecha de vencimiento ascendente
- **AND** dentro de un mismo día, las que tienen hora aparecen antes,
  ordenadas por hora ascendente, y las que no tienen hora aparecen después
- **AND** a igual fecha y hora, la de mayor prioridad aparece primero

#### Scenario: Sin preferencia guardada, Etiqueta y Filtro ordenan por fecha con las sin fecha al final

- **WHEN** un usuario abre la página de una Etiqueta o de un Filtro por
  primera vez, sin ninguna fila en `view_preferences` para esa clave
- **THEN** las tareas se ordenan por fecha de vencimiento ascendente
- **AND** las tareas sin fecha de vencimiento aparecen al final
- **AND** a igual fecha, la de mayor prioridad aparece primero

### Requirement: Una clave desconocida en el `jsonb` se ignora

Si el `jsonb` de opciones de una pantalla contiene una clave que el sistema no reconoce, esa clave SHALL ignorarse al leer, sin impedir que el resto de las opciones válidas se aplique ni romper la vista. `formato_calendario` dejó de ser un ejemplo de clave desconocida: desde esta fase es una clave válida, consumida por el control de formato de calendario.

#### Scenario: Una clave vieja o inválida no rompe la vista

- **WHEN** la fila de `view_preferences` de un proyecto contiene una clave `orden_experimental` que ya no es válida, junto con un `orden` válido
- **THEN** la vista se muestra usando el `orden` guardado
- **AND** la vista no falla ni muestra un error por la clave desconocida

### Requirement: Formato de calendario, solo cuando la forma de ver es calendario

La barra SHALL ofrecer el control "formato de calendario", con los valores día, cuatro días, semana y mes, únicamente cuando la forma de ver activa es "calendario". Las demás formas de ver MUST NOT mostrar este control.

#### Scenario: El control aparece solo con la forma de ver calendario

- **WHEN** el usuario cambia la forma de ver a "calendario" en Bandeja, Proyecto o Próximos
- **THEN** la barra de opciones de vista muestra el control de formato de calendario con los valores día, cuatro días, semana y mes

#### Scenario: El control no aparece en lista ni en panel

- **WHEN** la forma de ver activa es "lista" o "panel"
- **THEN** la barra de opciones de vista no muestra el control de formato de calendario

### Requirement: El disparador indica cuándo hay opciones activas distintas de las por defecto

El disparador de opciones de vista SHALL mostrar una indicación visual cuando al menos una de sus opciones —orden, agrupación, un filtro rápido, o los interruptores de completadas o de hábitos— tiene un valor distinto del valor por defecto de esa pantalla, y MUST NOT mostrar esa indicación cuando todas las opciones están en su valor por defecto.

#### Scenario: El disparador se marca cuando hay un filtro activo

- **WHEN** el usuario filtra por prioridad "Urgente" en la Bandeja de
  entrada y cierra el panel de opciones de vista
- **THEN** el disparador de opciones de vista muestra una indicación de que
  hay opciones activas

#### Scenario: El disparador no se marca con los valores por defecto

- **WHEN** el usuario abre una pantalla sin haber cambiado ninguna de sus
  opciones de vista
- **THEN** el disparador de opciones de vista no muestra ninguna
  indicación

#### Scenario: Restablecer quita la indicación

- **WHEN** el usuario presiona "restablecer" con al menos una opción
  distinta de su valor por defecto
- **THEN** el disparador de opciones de vista deja de mostrar la
  indicación

