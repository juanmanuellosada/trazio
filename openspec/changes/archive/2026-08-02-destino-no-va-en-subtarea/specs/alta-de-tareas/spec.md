## MODIFIED Requirements

### Requirement: Campos y accesos del componente de alta

El componente de alta SHALL ofrecer, en sus dos tratamientos, un campo de
título, un campo de descripción, y accesos para asignar fecha, prioridad,
fecha límite, **etiquetas, recordatorios** y **proyecto y sección de destino**.

El destino SHALL mostrarse en las dos superficies, como un control que indica a
dónde va a quedar la tarea y permite cambiarlo, **salvo cuando el alta se abre con una
tarea padre**: una subtarea hereda el proyecto de su padre y no puede estar en otro, así
que ahí el control de destino NUNCA SHALL mostrarse. La excepción rige por tener padre, no
por tratamiento: dentro de una lista o de una sección, sin padre, el destino se muestra
igual.

Los controles de fecha, fecha
límite y prioridad SHALL ser los selectores definidos por la capacidad
`selectores-de-atributos` en las dos superficies; este requisito no redefine su
comportamiento interno, solo exige que el alta los use. Los de etiquetas y
recordatorios SHALL ser los mismos que usa el detalle de una tarea.

#### Scenario: Los dos tratamientos ofrecen los mismos atributos

- **WHEN** se abre el componente de alta, en cualquiera de sus dos tratamientos,
  con todos sus campos desplegados
- **THEN** se ofrecen título, descripción, y accesos para fecha, prioridad,
  fecha límite, etiquetas, recordatorios y destino
- **AND** cada acceso abre el selector compartido correspondiente

#### Scenario: El tratamiento incrustado también muestra el destino

- **WHEN** se abre el componente de alta dentro de una lista o de una sección
- **THEN** SHALL mostrarse a qué proyecto y, si corresponde, a qué sección va a
  quedar la tarea
- **AND** ese control SHALL permitir cambiarlo sin salir del alta

#### Scenario: El alta de una subtarea no ofrece destino

- **WHEN** se abre el componente de alta para crear una subtarea, desde el menú de una
  fila o desde el detalle de una tarea
- **THEN** NUNCA SHALL mostrarse el control de destino
- **AND** la subtarea SHALL quedar en el mismo proyecto y la misma sección que su padre

#### Scenario: La excepción no alcanza al alta sin padre en una sección

- **WHEN** se abre el componente de alta dentro de una sección de un proyecto, sin tarea
  padre
- **THEN** el destino SHALL mostrarse igual que siempre
