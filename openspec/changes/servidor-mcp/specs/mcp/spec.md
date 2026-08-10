## ADDED Requirements

### Requirement: Toda herramienta del MCP opera bajo el token OAuth del usuario conectado

Cada llamada a una herramienta del servidor MCP SHALL autenticarse con el
access token OAuth del usuario que autorizó la conexión (D-A de
`design.md`), y SHALL ejecutar toda lectura y escritura bajo las mismas
políticas de RLS que aplican a la sesión de la app. El servidor MCP NUNCA
SHALL usar la `service_role` key para ninguna operación.

#### Scenario: Sin token válido, ninguna herramienta responde

- **WHEN** se invoca cualquier herramienta del MCP sin un access token OAuth
  válido, o con uno vencido
- **THEN** la herramienta SHALL rechazar la llamada
- **AND** NUNCA SHALL devolver datos de ninguna cuenta

#### Scenario: RLS aísla igual que en la app

- **WHEN** dos cuentas distintas conectan el mismo cliente MCP
- **THEN** las herramientas invocadas con el token de una cuenta NUNCA SHALL
  devolver ni modificar filas de la otra

### Requirement: `consultar_tareas` filtra tareas con el lenguaje de consulta existente

La herramienta `consultar_tareas` SHALL aceptar un parámetro `consulta` con
un texto en el mismo lenguaje de filtros que usan el Buscador y los Filtros
guardados (capacidad `lenguaje-de-consulta`), SHALL parsearlo al mismo AST
que consume el RPC `buscar_tareas`, y SHALL devolver las tareas resultantes
con su descripción convertida de jsonb de Tiptap a texto. `consultar_tareas`
es el nombre de la herramienta MCP; `buscar_tareas` sigue siendo el nombre
del RPC de Postgres que envuelve — son capas distintas y llevan nombres
distintos a propósito (D-G de `design.md`). El parámetro se llama `consulta`,
no `query`, porque no corresponde a ninguna columna de la base (D-H).

#### Scenario: Una consulta combinada devuelve el mismo resultado que en la app

- **WHEN** se invoca `consultar_tareas` con una consulta como
  `project:trabajo & priority:1,2 & due:overdue`
- **THEN** el resultado SHALL coincidir con el que produce la misma consulta
  evaluada por `buscar_tareas` desde la aplicación

#### Scenario: Una consulta inválida se rechaza con un motivo

- **WHEN** se invoca `consultar_tareas` con una consulta que no es válida en
  el lenguaje de filtros
- **THEN** la herramienta SHALL rechazar la llamada
- **AND** SHALL indicar qué parte de la consulta no se pudo interpretar

#### Scenario: La descripción llega como texto, no como jsonb

- **WHEN** el resultado de `consultar_tareas` incluye tareas con descripción
- **THEN** cada descripción SHALL entregarse como texto legible
- **AND** NUNCA SHALL entregarse el jsonb de Tiptap sin convertir

### Requirement: `obtener_tarea` trae el detalle completo de una tarea, sin comentarios ni recordatorios

La herramienta `obtener_tarea` SHALL recibir el id de una tarea y SHALL
devolver todos sus campos propios, sus subtareas y sus etiquetas, con la
descripción convertida a texto. `obtener_tarea` NUNCA SHALL incluir
comentarios ni recordatorios de la tarea: quedan fuera del alcance de
lectura del MCP.

#### Scenario: Detalle de una tarea con subtareas y etiquetas

- **WHEN** se invoca `obtener_tarea` con el id de una tarea que tiene
  subtareas y etiquetas
- **THEN** la respuesta SHALL incluir sus subtareas y sus etiquetas

#### Scenario: Comentarios y recordatorios nunca salen

- **WHEN** la tarea consultada con `obtener_tarea` tiene comentarios o
  recordatorios
- **THEN** la respuesta NUNCA SHALL incluirlos

#### Scenario: Un id de otra cuenta no devuelve nada

- **WHEN** se invoca `obtener_tarea` con el id de una tarea que no pertenece
  a la cuenta del token usado
- **THEN** la herramienta NUNCA SHALL devolver esa tarea

### Requirement: `listar_estructura` trae proyectos, secciones, etiquetas y filtros

La herramienta `listar_estructura` SHALL devolver el árbol de proyectos (con
sus subproyectos y sus secciones), las etiquetas y los filtros guardados de
la cuenta, en una sola llamada.

#### Scenario: El árbol de proyectos conserva la jerarquía

- **WHEN** se invoca `listar_estructura` en una cuenta con proyectos
  anidados
- **THEN** la respuesta SHALL reflejar la relación de proyecto padre e hijo

#### Scenario: Incluye secciones, etiquetas y filtros

- **WHEN** se invoca `listar_estructura`
- **THEN** la respuesta SHALL incluir las secciones de cada proyecto, las
  etiquetas de la cuenta y sus filtros guardados

### Requirement: `listar_habitos` trae los hábitos con su estado y sus métricas

La herramienta `listar_habitos` SHALL devolver los hábitos de la cuenta con
su estado del día (pendiente, hecho o salteado), su racha actual, su mejor
racha, su constancia y su contador de repeticiones — los mismos cálculos de
lectura que usa `pantalla-habitos`.

#### Scenario: Estado del día correcto

- **WHEN** se invoca `listar_habitos` y un hábito ya se marcó como hecho hoy
- **THEN** ese hábito SHALL figurar con estado "hecho" en la respuesta

### Requirement: `crear_tarea` da de alta una tarea a partir de lenguaje natural

La herramienta `crear_tarea` SHALL aceptar un texto en lenguaje natural y
SHALL interpretarlo con el mismo parser que usa el alta rápida de la
aplicación (`lib/parser/`), reconociendo los mismos atributos (fecha, hora,
prioridad, etiquetas, proyecto y sección cuando se escriben en el texto).
SHALL aceptar además `project_id`, `section_id` y `parent_id` como contexto
estructurado opcional, para el destino que el texto no exprese. `crear_tarea`
NUNCA SHALL aceptar `position` como parámetro: la base SHALL asignarla.
Cuando se provee `description` y no es `null`, la herramienta SHALL validar
su forma antes de guardarla: si no es un string, SHALL cumplir la forma
`{type: "doc", content: [...]}` de un documento de Tiptap, o la escritura
SHALL rechazarse. Un string SHALL guardarse tal cual, sin conversión —
Tiptap lo interpreta como HTML al leerlo. `crear_tarea` es una herramienta
propia, distinta de `crear`: es la única operación de escritura del MCP que
recibe lenguaje natural en vez de campos ya estructurados.

#### Scenario: Crear una tarea desde una frase en lenguaje natural

- **WHEN** se invoca `crear_tarea` con un texto como "pagar el alquiler
  mañana a las 10, prioridad alta"
- **THEN** la tarea SHALL crearse con la fecha, la hora y la prioridad que
  el parser reconoce de ese texto

#### Scenario: Crear una tarea sin indicar posición

- **WHEN** se invoca `crear_tarea` sin el campo `position`
- **THEN** la tarea SHALL crearse
- **AND** SHALL quedar como último hermano de su contexto (mismo proyecto,
  sección y tarea padre)

#### Scenario: Una descripción en texto plano se guarda tal cual

- **WHEN** se invoca `crear_tarea` con una `description` en texto plano
- **THEN** la tarea creada SHALL guardar ese string tal cual, sin conversión
- **AND** esa descripción SHALL poder editarse después desde el editor de la
  app sin error, porque Tiptap la interpreta como HTML al leerla

#### Scenario: Una descripción con forma inválida se rechaza

- **WHEN** se invoca `crear_tarea` con una `description` que no es `null`,
  no es un string y no cumple la forma `{type: "doc", content: [...]}`
- **THEN** la llamada SHALL rechazarse
- **AND** la tarea NUNCA SHALL crearse con esa descripción

### Requirement: `crear` da de alta un proyecto, hábito, etiqueta o filtro

La herramienta `crear` SHALL aceptar un discriminador `tipo` con los
valores `proyecto`, `habito`, `etiqueta` y `filtro`, y los campos propios de
cada tipo que el esquema protege directamente. `crear` NUNCA SHALL aceptar
`tipo: tarea`: crear una tarea SHALL hacerse exclusivamente con
`crear_tarea`. Cuando `tipo` es `proyecto`, `crear` NUNCA SHALL aceptar
`position` como parámetro: la base SHALL asignarla. Cuando `tipo` es
`filtro`, la herramienta SHALL validar la consulta contra el parser del
lenguaje de filtros antes de guardarla y SHALL rechazar la creación si la
consulta no es válida.

#### Scenario: Crear un proyecto sin indicar posición

- **WHEN** se invoca `crear` con `tipo: proyecto` sin el campo `position`
- **THEN** el proyecto SHALL crearse
- **AND** SHALL quedar como último hermano de su contexto

#### Scenario: `tipo: tarea` se rechaza

- **WHEN** se invoca `crear` con `tipo: tarea`
- **THEN** la llamada SHALL rechazarse

#### Scenario: Un filtro con consulta inválida se rechaza

- **WHEN** se invoca `crear` con `tipo: filtro` y una `query` que no es
  válida en el lenguaje de filtros
- **THEN** la creación SHALL rechazarse
- **AND** el filtro NUNCA SHALL guardarse

### Requirement: `editar` edita cualquiera de las cinco entidades, sin tocar completado ni posición

La herramienta `editar` SHALL aceptar un discriminador `tipo` con los
valores `tarea`, `proyecto`, `habito`, `etiqueta` y `filtro`, el `id` de la
entidad y los campos a cambiar — a diferencia de `crear`, `editar` SHALL
aceptar `tipo: tarea`, porque editar una tarea existente es siempre un
parche de campos estructurados, sin la firma de lenguaje natural que separa
a `crear_tarea`. `editar` NUNCA SHALL aceptar `completed_at` como campo, sin
importar el `tipo`: completar o descompletar una tarea SHALL hacerse
exclusivamente con `completar_tarea`. `editar` NUNCA SHALL aceptar
`position`. Cuando el `tipo` es `tarea` y se provee `description`, aplica la
misma validación de forma que `crear_tarea`: si no es `null` ni un string,
SHALL cumplir la forma de un documento de Tiptap o la escritura SHALL
rechazarse.

#### Scenario: Editar campos protegidos por el esquema

- **WHEN** se invoca `editar` con `tipo: tarea` cambiando título, prioridad
  o etiquetas
- **THEN** los cambios SHALL aplicarse

#### Scenario: `completed_at` se rechaza explícitamente

- **WHEN** se invoca `editar` con `tipo: tarea` incluyendo `completed_at`
  entre los campos
- **THEN** la llamada SHALL rechazarse
- **AND** NUNCA SHALL modificarse el estado de completado de la tarea por
  esta vía

#### Scenario: `position` se rechaza explícitamente

- **WHEN** se invoca `editar` con `position` entre los campos, para
  cualquier `tipo`
- **THEN** la llamada SHALL rechazarse

### Requirement: `completar_tarea` completa o descompleta, y crea la siguiente ocurrencia si es recurrente

La herramienta `completar_tarea` SHALL recibir el id de una tarea y un
booleano `completado`. Al pasar a `completado: true` sobre una tarea con
`recurrence_rule`, SHALL crear la siguiente ocurrencia de la serie, con el
mismo criterio que ya usa la aplicación al completar una tarea recurrente
desde la interfaz. Al pasar a `completado: false`, NUNCA SHALL disparar
ningún efecto lateral de recurrencia.

#### Scenario: Completar una tarea recurrente genera la siguiente

- **WHEN** se invoca `completar_tarea` con `completado: true` sobre una
  tarea con `recurrence_rule` cuya serie no terminó
- **THEN** esa tarea SHALL quedar completada
- **AND** SHALL crearse la siguiente ocurrencia de la serie

#### Scenario: Completar una tarea no recurrente no crea nada

- **WHEN** se invoca `completar_tarea` con `completado: true` sobre una
  tarea sin `recurrence_rule`
- **THEN** esa tarea SHALL quedar completada
- **AND** NUNCA SHALL crearse ninguna tarea adicional

#### Scenario: Descompletar nunca revive ni borra la siguiente ocurrencia

- **WHEN** se invoca `completar_tarea` con `completado: false` sobre una
  tarea recurrente ya completada, cuya siguiente ocurrencia ya existe
- **THEN** esa tarea SHALL volver a quedar pendiente
- **AND** la siguiente ocurrencia ya creada NUNCA SHALL modificarse ni
  borrarse por esta llamada

### Requirement: `archivar` archiva proyectos y hábitos, nunca borra nada

La herramienta `archivar` SHALL aceptar un discriminador `tipo` con los
valores `proyecto` y `habito`, y el `id` de la entidad. Es la única forma de
"dar de baja" que el servidor MCP ofrece. Ningún `tipo` adicional a
`proyecto` y `habito` SHALL aceptarse.

#### Scenario: Archivar un proyecto lo saca del día a día sin borrarlo

- **WHEN** se invoca `archivar` con `tipo: proyecto`
- **THEN** ese proyecto SHALL quedar archivado
- **AND** sus tareas y secciones NUNCA SHALL perderse

#### Scenario: Un `tipo` fuera de proyecto y hábito se rechaza

- **WHEN** se invoca `archivar` con un `tipo` distinto de `proyecto` o
  `habito`
- **THEN** la llamada SHALL rechazarse

### Requirement: El servidor MCP nunca ofrece borrar

Ninguna herramienta del servidor MCP SHALL exponer una operación de borrado
físico, sobre ninguna entidad. Borrar SHALL seguir siendo exclusivo de la
aplicación, con su confirmación y su deshacer.

#### Scenario: No existe ninguna herramienta de borrado

- **WHEN** se enumeran las herramientas que expone el servidor MCP
- **THEN** ninguna de ellas SHALL borrar una tarea, un proyecto, un hábito,
  una etiqueta, un filtro ni ninguna otra entidad

### Requirement: El servidor MCP no crea ni edita secciones

El alcance de escritura del MCP SHALL cubrir tareas, proyectos, hábitos,
etiquetas y filtros. Secciones SHALL ser legibles a través de
`listar_estructura`, pero ninguna herramienta de escritura del MCP SHALL
crear ni editar una sección.

#### Scenario: `crear` y `editar` no aceptan `tipo: seccion`

- **WHEN** se invoca `crear` o `editar` con `tipo: seccion`
- **THEN** la llamada SHALL rechazarse
