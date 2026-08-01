# administracion-de-calendarios Specification

## Purpose
TBD - created by archiving change fase-4-calendario. Update Purpose after archive.
## Requirements
### Requirement: Permiso necesario para administrar calendarios

Administrar calendarios de Google desde Trazio —crear, renombrar, recolorear o eliminar— SHALL requerir el permiso `https://www.googleapis.com/auth/calendar` completo, porque los scopes de solo eventos y de solo lectura de la lista de calendarios no alcanzan para estas operaciones.

#### Scenario: Sin el permiso completo, las acciones de administración no están disponibles

- **WHEN** la conexión con Google se autorizó sin el scope `calendar` completo
- **THEN** Trazio no ofrece crear, renombrar, recolorear ni eliminar
  calendarios, solo leer los existentes y elegir cuáles mostrar

### Requirement: Crear un calendario de Google desde Trazio

Trazio SHALL permitir crear un calendario nuevo en la cuenta de Google conectada, indicando su nombre, y ese calendario nuevo SHALL aparecer en la lista de calendarios disponibles para habilitar.

#### Scenario: Crear un calendario nuevo

- **WHEN** se crea un calendario con el nombre "Personal" desde Trazio
- **THEN** el calendario "Personal" queda creado en la cuenta de Google
  conectada
- **AND** aparece en la lista de calendarios que se pueden habilitar en Trazio

### Requirement: Renombrar un calendario de Google desde Trazio

Trazio SHALL permitir cambiar el nombre de un calendario existente en la cuenta de Google conectada, y ese cambio SHALL reflejarse en Google.

#### Scenario: Renombrar un calendario

- **WHEN** se cambia el nombre de un calendario de "Trabajo" a "Oficina"
- **THEN** el calendario aparece con el nombre "Oficina" tanto en Trazio como
  en Google

### Requirement: Recolorear un calendario con los colores que admite Google

El color de un calendario de Google SHALL elegirse entre los colores que la API de Google Calendar admite para calendarios, y no entre los diez colores con nombre de la paleta fija que D19 impone a proyectos y etiquetas de Trazio, porque un calendario de Google es un objeto ajeno a Trazio cuya paleta de colores la define Google.

#### Scenario: Recolorear un calendario con un color de Google

- **WHEN** se elige uno de los colores que ofrece la API de Google Calendar
  para un calendario habilitado
- **THEN** el calendario queda con ese color en Google y Trazio lo muestra con
  el mismo color

#### Scenario: La paleta fija de proyectos y etiquetas no aparece en este selector

- **WHEN** se abre el selector de color de un calendario de Google
- **THEN** las opciones ofrecidas son los colores de calendario que admite
  Google, no los diez colores con nombre de `projects.color` ni
  `labels.color`

### Requirement: Eliminar un calendario es destructivo y exige confirmación explícita

Eliminar un calendario de Google desde Trazio SHALL exigir una confirmación explícita que indique que se pierde el calendario y todos sus eventos, y que esa pérdida afecta a la cuenta de Google completa y no solo a lo que se ve en Trazio, y la eliminación NUNCA SHALL ejecutarse sin esa confirmación.

#### Scenario: La confirmación explica qué se pierde

- **WHEN** se inicia la eliminación de un calendario que tiene eventos
  cargados
- **THEN** el diálogo de confirmación indica que se elimina el calendario y
  todos sus eventos de la cuenta de Google, y que ese cambio se ve en
  cualquier aplicación conectada a esa cuenta, no solo en Trazio

#### Scenario: Eliminar sin confirmar no ejecuta nada

- **WHEN** se cierra el diálogo de confirmación sin confirmar
- **THEN** el calendario permanece intacto en Google y en Trazio

#### Scenario: Confirmar elimina el calendario en Google

- **WHEN** se confirma la eliminación de un calendario
- **THEN** el calendario y sus eventos se eliminan de la cuenta de Google
- **AND** el calendario deja de aparecer en la lista de calendarios
  disponibles en Trazio

