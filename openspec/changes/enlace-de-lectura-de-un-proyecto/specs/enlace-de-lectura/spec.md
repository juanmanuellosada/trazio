## ADDED Requirements

### Requirement: Un proyecto puede generar un enlace de lectura

El menú de un proyecto SHALL ofrecer generar un enlace de lectura. Quien tenga el enlace SHALL poder ver el proyecto sin registrarse y sin iniciar sesión.

El enlace SHALL poder regenerarse —lo que invalida el anterior— y desactivarse.

Al generarlo, la interfaz SHALL advertir que cualquiera con el enlace puede ver el proyecto. NUNCA SHALL enterrarse esa consecuencia.

La Bandeja de entrada NUNCA SHALL poder compartirse.

#### Scenario: Generar y abrir el enlace

- **WHEN** se genera el enlace de lectura de un proyecto y se abre en una sesión sin cuenta
- **THEN** SHALL verse el proyecto

#### Scenario: Regenerar invalida el anterior

- **WHEN** se regenera el enlace de un proyecto
- **THEN** el enlace anterior NUNCA SHALL dar acceso

#### Scenario: Desactivar corta el acceso

- **WHEN** se desactiva el enlace de un proyecto
- **THEN** ese enlace NUNCA SHALL dar acceso

#### Scenario: La Bandeja no se comparte

- **WHEN** se abre el menú de la Bandeja de entrada
- **THEN** NUNCA SHALL ofrecerse generar un enlace

### Requirement: El token es un secreto de alta entropía, ajeno al identificador del proyecto

El token SHALL generarse en la base de datos con al menos 256 bits de aleatoriedad, y SHALL ser independiente del identificador del proyecto.

El identificador del proyecto NUNCA SHALL servir como enlace de lectura: es adivinable desde cualquier lugar donde ya aparezca y no se puede revocar sin borrar el proyecto.

#### Scenario: Dos proyectos del mismo dueño no comparten patrón

- **WHEN** se generan enlaces para dos proyectos
- **THEN** conocer uno NUNCA SHALL permitir derivar el otro

#### Scenario: El identificador del proyecto no abre nada

- **WHEN** se intenta acceder a la vista pública usando el identificador de un proyecto en lugar de su token
- **THEN** NUNCA SHALL devolverse contenido

### Requirement: La lectura pública pasa por una única función acotada

El acceso público SHALL resolverse con una única función `security definer`, con `search_path` acotado, revocada de `public` y otorgada únicamente al rol anónimo.

La función SHALL recibir **el token y nada más**. NUNCA SHALL aceptar un identificador de proyecto: aceptarlo permitiría leer cualquier proyecto a quien conozca un identificador.

La función SHALL enumerar explícitamente las columnas que devuelve. NUNCA SHALL usar `select *`: una columna agregada en el futuro se publicaría sola, y la lista explícita convierte esa fuga en un cambio deliberado.

Un token inexistente y un token revocado SHALL producir el mismo resultado, para no confirmar que un enlace existió.

#### Scenario: La función no acepta un identificador de proyecto

- **WHEN** se invoca la función con un identificador de proyecto válido en lugar de un token
- **THEN** NUNCA SHALL devolver contenido

#### Scenario: Token inexistente y token revocado son indistinguibles

- **WHEN** se consulta con un token que nunca existió y con uno revocado
- **THEN** las dos respuestas SHALL ser iguales

#### Scenario: Una columna nueva no se publica sola

- **WHEN** se agrega una columna a `tasks`
- **THEN** la vista pública NUNCA SHALL incluirla sin un cambio explícito en la función

### Requirement: Qué muestra y qué nunca muestra la vista pública

La vista pública SHALL mostrar el nombre, color e ícono del proyecto; el nombre y la descripción de sus secciones; y de cada tarea el título, la descripción, la fecha de vencimiento, la fecha límite, la prioridad, si está completada y sus subtareas.

La vista pública NUNCA SHALL mostrar comentarios, recordatorios, etiquetas, duración estimada, ni ningún dato de la cuenta dueña más allá del nombre del proyecto.

El criterio SHALL ser: si un dato dice algo de la persona en lugar de decir algo del proyecto, no sale.

#### Scenario: Se ven las tareas con sus atributos

- **WHEN** se abre un enlace de lectura de un proyecto con secciones y tareas
- **THEN** SHALL verse cada sección con sus tareas, su fecha, su prioridad y su estado

#### Scenario: Los comentarios nunca salen

- **WHEN** el proyecto compartido tiene tareas con comentarios
- **THEN** la vista pública NUNCA SHALL mostrarlos

#### Scenario: Las etiquetas nunca salen

- **WHEN** las tareas del proyecto compartido tienen etiquetas
- **THEN** la vista pública NUNCA SHALL mostrarlas

### Requirement: La vista pública no permite ninguna escritura

La vista pública NUNCA SHALL permitir crear, editar, completar, mover ni borrar nada, ni dejar comentarios. NUNCA SHALL ofrecer controles que sugieran esas acciones.

#### Scenario: No hay forma de completar una tarea

- **WHEN** se abre un enlace de lectura
- **THEN** NUNCA SHALL ofrecerse un control para completar una tarea

### Requirement: El enlace no se filtra ni se indexa

La ruta pública SHALL responder con `Referrer-Policy: no-referrer`, y todo enlace saliente que la vista renderice SHALL llevar `rel="noopener noreferrer"`. El token viaja en la URL, así que sin esto el `Referer` entregaría la llave a cualquier sitio enlazado desde la descripción de una tarea.

La ruta pública SHALL responder con `noindex` para buscadores, como cabecera y como meta.

#### Scenario: Tocar un enlace de una descripción no entrega el token

- **WHEN** quien mira la vista pública toca un enlace incluido en la descripción de una tarea
- **THEN** el sitio de destino NUNCA SHALL recibir la URL con el token

#### Scenario: La vista no es indexable

- **WHEN** un buscador visita la ruta pública
- **THEN** SHALL recibir la indicación de no indexarla

### Requirement: La vista pública no comparte el layout de la aplicación

La vista pública SHALL vivir fuera del layout privado. NUNCA SHALL renderizar el panel lateral, los atajos ni ningún dato de la sesión de quien mira.

Quien tenga una sesión propia y abra un enlace ajeno SHALL ver exactamente lo mismo que alguien sin cuenta.

#### Scenario: Alguien logueado ve lo mismo que un anónimo

- **WHEN** una persona con su propia sesión abre el enlace de lectura de otra
- **THEN** SHALL ver el mismo contenido que vería sin sesión
- **AND** NUNCA SHALL verse su propio panel lateral

### Requirement: Archivar no revoca el enlace

Un proyecto archivado SHALL seguir accesible por su enlace: archivar es organización personal, no una decisión sobre quién puede mirar. Borrar el proyecto SÍ SHALL cortar el acceso.

#### Scenario: Archivar mantiene el enlace

- **WHEN** se archiva un proyecto que tiene enlace de lectura
- **THEN** el enlace SHALL seguir funcionando

#### Scenario: Borrar corta el acceso

- **WHEN** se borra un proyecto compartido
- **THEN** su enlace NUNCA SHALL dar acceso
