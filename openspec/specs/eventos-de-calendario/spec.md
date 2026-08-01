# eventos-de-calendario Specification

## Purpose
TBD - created by archiving change fase-4-calendario. Update Purpose after archive.
## Requirements
### Requirement: Lectura de eventos por rango con caché corta en memoria del servidor

Trazio SHALL leer los eventos de los calendarios habilitados por rango de fechas directamente de la API de Google, SHALL cachear el resultado en memoria del servidor durante 60 segundos por combinación de usuario, calendario y rango consultado, y los eventos NUNCA SHALL guardarse en la base de datos de Trazio.

#### Scenario: Una segunda consulta dentro de los 60 segundos no vuelve a llamar a Google

- **WHEN** se consulta el mismo rango de fechas para el mismo calendario dos
  veces dentro de una ventana de 60 segundos
- **THEN** la segunda consulta se responde desde el caché en memoria del
  servidor, sin una nueva llamada a la API de Google

#### Scenario: Pasados los 60 segundos, se vuelve a consultar a Google

- **WHEN** se consulta el mismo rango y calendario después de que pasaron más
  de 60 segundos desde la última consulta
- **THEN** se hace una nueva llamada a la API de Google y el resultado
  reemplaza el valor cacheado

#### Scenario: Los eventos no dejan rastro en Postgres

- **WHEN** se inspecciona el esquema de la base de datos de Trazio
- **THEN** ninguna tabla guarda eventos de Google Calendar ni sus campos

### Requirement: Campos que se muestran de un evento

Trazio SHALL mostrar de cada evento su título, su horario, si es de todo el día, su ubicación, su descripción, el calendario de origen con el color de ese calendario, y si el evento se repite.

#### Scenario: Un evento puntual muestra sus campos básicos

- **WHEN** se muestra un evento con título "Turno dentista", horario de 15:00
  a 15:30, ubicación "Av. Corrientes 1234" y sin descripción
- **THEN** se ven el título, el horario y la ubicación, y no se muestra
  ninguna descripción

#### Scenario: Un evento de todo el día se distingue de uno con horario

- **WHEN** se muestra un evento marcado como de todo el día en Google
- **THEN** Trazio lo muestra señalando que es de todo el día, sin un horario
  de inicio y fin puntual

#### Scenario: El calendario de origen aparece con su color

- **WHEN** se muestra un evento que pertenece a un calendario llamado
  "Trabajo" con un color asignado en Google
- **THEN** el evento se muestra asociado a ese calendario y con su color

#### Scenario: Un evento recurrente se identifica como tal

- **WHEN** se muestra un evento que forma parte de una serie recurrente en
  Google
- **THEN** se indica visualmente que el evento se repite

### Requirement: Crear, editar, mover y eliminar eventos desde Trazio

Trazio SHALL permitir crear un evento nuevo, editar sus campos, moverlo a otro horario y eliminarlo, y cada una de estas cuatro operaciones SHALL reflejarse en el calendario de Google correspondiente a través de la API.

#### Scenario: Crear un evento

- **WHEN** se crea un evento con título "Reunión de equipo", horario de 10:00
  a 11:00 el 3 de agosto, en el calendario habilitado "Trabajo"
- **THEN** el evento queda creado en ese calendario de Google y visible en
  Trazio en la próxima consulta

#### Scenario: Editar un evento puntual

- **WHEN** se edita el título o el horario de un evento que no forma parte de
  ninguna serie recurrente
- **THEN** el cambio se aplica sobre ese evento en Google

#### Scenario: Mover un evento a otro horario

- **WHEN** se cambia el horario de un evento puntual de 10:00 a 14:00
- **THEN** el evento queda en Google con el nuevo horario

#### Scenario: Eliminar un evento puntual

- **WHEN** se elimina un evento que no forma parte de ninguna serie recurrente
- **THEN** el evento se elimina en Google y deja de aparecer en Trazio

### Requirement: Editar o eliminar un evento recurrente pregunta el alcance, sin default silencioso

Editar o eliminar un evento que forma parte de una serie recurrente SHALL preguntar antes de aplicar el cambio si afecta a esta ocurrencia, a esta y las siguientes, o a todas las ocurrencias de la serie, y esa pregunta NUNCA SHALL tener una opción preseleccionada que permita confirmar sin elegir explícitamente una de las tres.

#### Scenario: Editar una ocurrencia de una serie recurrente pregunta el alcance

- **WHEN** se edita el horario de una ocurrencia de un evento que se repite
  todas las semanas
- **THEN** se pregunta si el cambio aplica a esta ocurrencia, a esta y las
  siguientes, o a todas
- **AND** no se aplica ningún cambio hasta que se elija una de las tres
  opciones

#### Scenario: Eliminar una serie completa

- **WHEN** se elige "todas" al eliminar una ocurrencia de un evento recurrente
- **THEN** la serie completa se elimina de Google

#### Scenario: Eliminar esta ocurrencia y las siguientes

- **WHEN** se elige "esta y las siguientes" al eliminar una ocurrencia que es
  la tercera de una serie de diez
- **THEN** las ocurrencias primera y segunda permanecen, y de la tercera en
  adelante se eliminan

#### Scenario: Ninguna opción queda preseleccionada

- **WHEN** se abre la pregunta de alcance al editar o eliminar una ocurrencia
  recurrente
- **THEN** ninguna de las tres opciones aparece marcada por defecto, y
  confirmar sin elegir ninguna no ejecuta ningún cambio

### Requirement: Las tareas y los hábitos de Trazio no se publican en Google

Crear, editar, completar o eliminar una tarea o un hábito en Trazio NUNCA SHALL generar, actualizar ni borrar ningún evento en Google Calendar: la conexión es de un solo sentido para tareas y hábitos, Trazio solo lee y edita eventos que ya existen en Google.

#### Scenario: Crear una tarea con fecha y hora no crea un evento en Google

- **WHEN** se crea una tarea con `due_at` puntual
- **THEN** no se crea ningún evento correspondiente en ningún calendario de
  Google

#### Scenario: Completar un hábito no toca Google

- **WHEN** se marca un hábito como hecho para hoy
- **THEN** ninguna llamada se hace a la API de Google como consecuencia de esa
  acción

### Requirement: Degradación cuando la API de Google falla

Si la API de Google Calendar falla o no responde al pedir eventos, Trazio SHALL seguir mostrando las tareas y los hábitos del rango consultado y SHALL avisar de forma visible que los eventos no pudieron cargarse, y esa situación NUNCA SHALL dejar la pantalla en blanco ni un indicador de carga girando sin resolverse.

#### Scenario: La API de Google responde con error

- **WHEN** se consulta Hoy y la API de Google Calendar responde con un error o
  con un timeout
- **THEN** las tareas y los hábitos de hoy se muestran con normalidad
- **AND** aparece un aviso indicando que los eventos no se pudieron cargar

#### Scenario: Sin conexión a internet no se escribe

- **WHEN** se intenta crear, editar o eliminar un evento sin conexión a
  internet
- **THEN** la operación se rechaza y se avisa que no hay conexión, siguiendo
  D1: sin conexión no se escribe

