# opciones-de-vista Specification

## Purpose
TBD - created by archiving change fase-2-potencia. Update Purpose after archive.
## Requirements
### Requirement: La barra de opciones de vista está presente en seis pantallas

La barra de opciones de vista SHALL estar presente en Bandeja de entrada, Hoy, Próximos, Proyecto, la página de una Etiqueta y la página de un Filtro.

#### Scenario: La barra aparece en las seis pantallas

- **WHEN** el usuario abre, una por una, la Bandeja de entrada, Hoy,
  Próximos, un Proyecto, la página de una Etiqueta y la página de un
  Filtro
- **THEN** cada una de esas seis pantallas muestra la barra de opciones de
  vista

### Requirement: Forma de ver, solo donde existe modo panel

La barra SHALL ofrecer un selector de forma de ver con los valores "lista" y "panel" únicamente en las pantallas donde `modo-panel` está disponible (Bandeja, Proyecto y Próximos). En Hoy, Etiqueta y Filtro, donde no hay modo panel, la barra MUST NOT mostrar el selector de forma de ver. El modo calendario no es un valor posible de este selector en fase 2: es fase 4.

#### Scenario: El selector aparece en Proyecto

- **WHEN** el usuario abre la barra de opciones de vista de un proyecto
- **THEN** ve un selector de forma de ver con los valores "lista" y "panel"

#### Scenario: El selector no aparece en Hoy

- **WHEN** el usuario abre la barra de opciones de vista de Hoy
- **THEN** no ve ningún selector de forma de ver

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

Las claves de opciones para mostrar hábitos y para mostrar repeticiones futuras de una tarea recurrente SHALL existir en el esquema de opciones persistido, como punto de extensión, pero la barra MUST NOT mostrarlas como controles interactivos en fase 2: los hábitos son fase 3 y las repeticiones futuras son una opción del modo calendario, que es fase 4.

#### Scenario: Ningún control de hábitos ni de repeticiones futuras es visible

- **WHEN** el usuario abre la barra de opciones de vista en cualquiera de
  las seis pantallas donde existe
- **THEN** no ve ningún control para mostrar u ocultar hábitos
- **AND** no ve ningún control para mostrar u ocultar repeticiones futuras

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

Si el `jsonb` de opciones de una pantalla contiene una clave que el sistema no reconoce, esa clave SHALL ignorarse al leer, sin impedir que el resto de las opciones válidas se aplique ni romper la vista.

#### Scenario: Una clave vieja o inválida no rompe la vista

- **WHEN** la fila de `view_preferences` de un proyecto contiene una clave
  `formato_calendario` que ya no es válida, junto con un `orden` válido
- **THEN** la vista se muestra usando el `orden` guardado
- **AND** la vista no falla ni muestra un error por la clave desconocida

