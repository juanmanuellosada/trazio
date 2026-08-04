## MODIFIED Requirements

### Requirement: Agrupar por, configurable

La barra SHALL ofrecer un control de agrupación con los valores nada, sección, fecha, prioridad y etiqueta, y cada valor SHALL significar lo mismo en la lista y en el panel.

El valor "nada" SHALL producir una sola lista corrida, sin bloques ni encabezados, en **todas** las pantallas. NUNCA SHALL significar la agrupación natural de la pantalla: un valor con dos comportamientos según dónde se lo mire es lo que este requisito viene a eliminar.

Cada pantalla SHALL tener un valor por defecto explícito. En Bandeja de entrada y Proyecto SHALL ser "sección", de modo que abrirlas se vea igual que antes de esta capacidad.

El valor "sección" NUNCA SHALL ofrecerse donde la vista cruza proyectos —Hoy, Próximos, la página de una etiqueta, la de un filtro, el buscador y Completado—: una sección pertenece a un proyecto y fuera de él no significa nada.

El valor "fecha" NUNCA SHALL ofrecerse en Hoy, que es un solo día.

El valor "etiqueta" NUNCA SHALL ofrecerse en la forma de ver "panel", donde una tarea con varias etiquetas aparecería repetida en varias columnas.

Cuando la preferencia guardada no está disponible en la pantalla o la forma de ver activa, el valor guardado NUNCA SHALL pisarse —volver a donde sí está disponible SHALL encontrarlo intacto— y la vista SHALL comportarse como si fuera el valor por defecto de esa pantalla.

#### Scenario: Agrupar por etiqueta

- **WHEN** el usuario elige "etiqueta" en el control de agrupar por, en
  una vista donde algunas tareas comparten etiquetas y otras no tienen
  ninguna
- **THEN** las tareas se agrupan por etiqueta
- **AND** las que no tienen ninguna quedan juntas en un grupo aparte

#### Scenario: El control de un proyecto ofrece los cinco valores

- **WHEN** el usuario abre el control de agrupar por en la lista de un proyecto
- **THEN** SHALL ver los valores nada, sección, fecha, prioridad y etiqueta

#### Scenario: Una vista que cruza proyectos no ofrece sección

- **WHEN** el usuario abre el control de agrupar por en la página de una etiqueta
- **THEN** NUNCA SHALL ver el valor "sección"

#### Scenario: Un proyecto abre agrupado por sección

- **WHEN** el usuario abre un proyecto sin haber tocado nunca su agrupador
- **THEN** el control SHALL indicar "sección"
- **AND** las tareas SHALL verse en bloques por sección, como antes de esta capacidad

#### Scenario: Un valor no disponible no se pisa

- **WHEN** el usuario tiene el agrupador en "sección" desde un proyecto, abre la página de una etiqueta y vuelve al proyecto
- **THEN** la página de la etiqueta SHALL haberse comportado como si fuera su valor por defecto
- **AND** al volver al proyecto el agrupador SHALL seguir en "sección"

### Requirement: Persistencia por pantalla en `view_preferences`

Las opciones de vista SHALL guardarse por pantalla en `view_preferences`, con una fila por usuario y clave de pantalla, y SHALL sincronizarse entre dispositivos.

Las preferencias ya guardadas con el valor "nada" en una clave de proyecto o de la Bandeja de entrada SHALL migrarse **una sola vez** al valor "sección", porque fueron guardadas cuando "nada" significaba la agrupación por sección en esas pantallas.

Esa migración NUNCA SHALL resolverse traduciendo el valor en cada lectura: eso dejaría la lista corrida inalcanzable para siempre en un proyecto, que es justamente la capacidad que se agrega.

#### Scenario: Una preferencia vieja conserva lo que el usuario veía

- **WHEN** un usuario tenía guardado "nada" en un proyecto antes de esta capacidad
- **THEN** después de la migración SHALL tener "sección"
- **AND** al abrir ese proyecto SHALL ver sus tareas en bloques por sección, igual que antes

#### Scenario: Elegir sin agrupar después de la migración se respeta

- **WHEN** el usuario elige "nada" en un proyecto después de la migración
- **THEN** SHALL ver una sola lista corrida
- **AND** al volver a abrir ese proyecto SHALL seguir viéndola corrida
