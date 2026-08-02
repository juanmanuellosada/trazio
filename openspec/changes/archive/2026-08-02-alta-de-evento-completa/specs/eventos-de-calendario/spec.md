## MODIFIED Requirements

### Requirement: Crear, editar, mover y eliminar eventos desde Trazio

Trazio SHALL permitir crear un evento nuevo, editar sus campos, moverlo a otro horario y eliminarlo, y cada una de estas cuatro operaciones SHALL reflejarse en el calendario de Google correspondiente a través de la API.

Crear y editar SHALL resolverse con **el mismo formulario**, y crear NUNCA SHALL ofrecer
menos campos que editar. Ese formulario SHALL permitir elegir título, calendario de destino,
fecha, hora de inicio y hora de fin, la opción de todo el día, repetición, descripción y
ubicación.

El horario SHALL proponerse según el contexto —el rango arrastrado en el calendario, o un
horario por defecto desde el panel lateral— y SHALL poder corregirse sin salir del
formulario. NUNCA SHALL mostrarse como un valor de solo lectura.

El formulario NUNCA SHALL ofrecer invitados ni adjuntar archivos: el producto es de una sola
persona por cuenta y los adjuntos están vetados.

#### Scenario: Crear un evento eligiendo su horario

- **WHEN** se crea un evento con título "Reunión de equipo", horario de 10:00
  a 11:00 el 3 de agosto, en el calendario habilitado "Trabajo"
- **THEN** el evento queda creado en ese calendario de Google y visible en
  Trazio en la próxima consulta
- **AND** el horario SHALL haberse podido elegir en el propio formulario

#### Scenario: El horario propuesto se puede corregir

- **WHEN** se abre el alta de evento desde el panel lateral, que propone un horario por
  defecto
- **THEN** ese horario SHALL poder cambiarse antes de guardar

#### Scenario: Crear un evento de todo el día

- **WHEN** se activa la opción de todo el día al crear
- **THEN** el evento SHALL crearse sin horas
- **AND** el formulario NUNCA SHALL seguir pidiendo hora de inicio y de fin

#### Scenario: Crear un evento que se repite

- **WHEN** se elige una repetición al crear un evento
- **THEN** el evento SHALL crearse como serie recurrente en Google
- **AND** las opciones rápidas de repetición SHALL derivarse de la fecha elegida

#### Scenario: Crear no ofrece menos que editar

- **WHEN** se comparan los campos disponibles al crear un evento con los disponibles al
  editarlo
- **THEN** SHALL ser los mismos

#### Scenario: El formulario no ofrece invitados ni adjuntos

- **WHEN** se abre el formulario de un evento
- **THEN** NUNCA SHALL ofrecerse invitar a otra persona ni adjuntar un archivo

#### Scenario: Editar un evento puntual

- **WHEN** se edita el título o el horario de un evento que no forma parte de
  ninguna serie recurrente
- **THEN** el cambio se aplica sobre ese evento en Google

#### Scenario: Cambiar la repetición exige un alcance que la admita

- **WHEN** se edita la regla de repetición de un evento que forma parte de una serie
- **THEN** el cambio NUNCA SHALL aplicarse con alcance de una sola ocurrencia
- **AND** SHALL ofrecerse solo los alcances en los que cambiar la regla tiene sentido

#### Scenario: Mover un evento a otro horario

- **WHEN** se cambia el horario de un evento puntual de 10:00 a 14:00
- **THEN** el evento queda en Google con el nuevo horario
