## ADDED Requirements

### Requirement: Consultar por fecha límite

El lenguaje SHALL aceptar el campo `deadline` con la misma forma que `due`: los mismos valores relativos, una fecha exacta, y `deadline:before:FECHA` / `deadline:after:FECHA`.

#### Scenario: Tareas con fecha límite vencida

- **WHEN** se consulta `deadline:overdue`
- **THEN** SHALL devolver las tareas cuya fecha límite ya pasó

#### Scenario: Fecha límite antes de una fecha

- **WHEN** se consulta `deadline:before:2026-09-01`
- **THEN** SHALL devolver las tareas con fecha límite anterior a esa fecha

### Requirement: Consultar por sección

El lenguaje SHALL aceptar el campo `section`, que compara por nombre. Como dos proyectos pueden tener secciones con el mismo nombre, `section` SHALL devolver las tareas de todas ellas — mismo criterio que `label` y `project`, que también comparan nombre y no identidad.

#### Scenario: Una sección devuelve sus tareas

- **WHEN** se consulta `section:Por hacer`
- **THEN** SHALL devolver las tareas de toda sección llamada "Por hacer"

#### Scenario: Acotar la sección a un proyecto

- **WHEN** se consulta `project:Casa & section:Por hacer`
- **THEN** SHALL devolver únicamente las de esa sección dentro de ese proyecto

### Requirement: Consultar un proyecto con sus descendientes

El lenguaje SHALL aceptar el campo `project_tree`, que devuelve las tareas de un proyecto y de todos sus subproyectos, a cualquier profundidad.

El campo `project` NUNCA SHALL cambiar de significado: sigue comparando el nombre exacto y NUNCA SHALL incluir descendientes. Hay filtros guardados que dependen de eso, y hacerlo recursivo cambiaría en silencio lo que devuelven.

#### Scenario: Un proyecto con hijos trae lo de abajo

- **WHEN** el proyecto "Casa" tiene el subproyecto "Casa / Cocina", y se consulta `project_tree:Casa`
- **THEN** SHALL devolver las tareas de los dos

#### Scenario: `project` sigue siendo exacto

- **WHEN** se consulta `project:Casa` en esa misma estructura
- **THEN** SHALL devolver únicamente las tareas de "Casa", NUNCA las de su subproyecto

### Requirement: Consultar tareas sin ninguna etiqueta

El lenguaje SHALL aceptar el campo booleano `no_label`, con la misma forma que `no_project`.

#### Scenario: Tareas sin etiqueta

- **WHEN** se consulta `no_label:true`
- **THEN** SHALL devolver las tareas que no tienen ninguna etiqueta

### Requirement: Consultar tareas con fecha y sin hora

El campo `due` SHALL aceptar el valor `notime`, que selecciona las tareas **con fecha de vencimiento y sin hora**.

Una tarea sin ninguna fecha NUNCA SHALL aparecer en `due:notime`: para eso está `due:nodate`.

NUNCA SHALL agregarse un campo aparte para esto: es una pregunta sobre la fecha de vencimiento y vive en el espacio de valores que `due` ya cubre.

#### Scenario: Tareas con fecha y sin hora

- **WHEN** se consulta `due:notime`
- **THEN** SHALL devolver las tareas que tienen fecha de vencimiento sin hora

#### Scenario: Una tarea sin fecha no aparece

- **WHEN** una tarea no tiene ninguna fecha y se consulta `due:notime`
- **THEN** esa tarea NUNCA SHALL aparecer en el resultado

### Requirement: Los campos nuevos aparecen en la referencia sin mantenerla aparte

Cada campo agregado al lenguaje SHALL aparecer en la referencia del modal de filtro y en el mensaje de campo desconocido del parser, derivando de la misma fuente. NUNCA SHALL poder agregarse un campo sin su entrada en la referencia.

#### Scenario: Agregar un campo obliga a documentarlo

- **WHEN** se agrega un campo a la lista del lenguaje sin su entrada en la referencia
- **THEN** la verificación de tipos SHALL fallar
