## ADDED Requirements

### Requirement: Las tareas atrasadas se reprograman en conjunto desde su encabezado

El encabezado del bloque de atrasadas SHALL ofrecer reprogramarlas todas sin entrar al modo de selección múltiple. SHALL ofrecer Hoy y Mañana de forma directa, y elegir otra fecha con el selector que ya existe.

NUNCA SHALL ofrecerse "Sin fecha" en esta acción: quitarle la fecha a una tarea vencida la hace desaparecer de Hoy sin dejar rastro, que es lo contrario de lo que se busca al ordenar el día. Sigue disponible desde la selección múltiple.

La acción SHALL alcanzar exactamente a las tareas atrasadas **que se están mostrando**: cuando hay un filtro rápido activo, NUNCA SHALL tocar las que ese filtro dejó afuera.

La acción SHALL indicar cuántas tareas alcanza antes de aplicarse.

La acción SHALL ser deshacible como una sola acción, igual que el resto de las acciones en lote, y NUNCA SHALL pedir confirmación.

#### Scenario: Reprogramar todas las atrasadas a hoy

- **WHEN** hay doce tareas atrasadas y se usa la acción del encabezado eligiendo Hoy
- **THEN** las doce SHALL pasar a vencer hoy
- **AND** NUNCA SHALL pedirse confirmación
- **AND** SHALL poder deshacerse como una sola acción

#### Scenario: Un filtro activo acota el alcance

- **WHEN** hay veinte atrasadas, un filtro rápido de prioridad deja ver solo cinco, y se reprograman desde el encabezado
- **THEN** SHALL reprogramarse únicamente esas cinco

#### Scenario: El alcance se dice antes de aplicar

- **WHEN** el bloque muestra doce atrasadas
- **THEN** la acción SHALL indicar que alcanza a doce

#### Scenario: No se ofrece quitar la fecha

- **WHEN** se abre la acción de reprogramar del encabezado
- **THEN** NUNCA SHALL ofrecerse "Sin fecha"
