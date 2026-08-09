# onboarding-con-ejemplos Specification

## Purpose
TBD - created by archiving change onboarding-con-ejemplos. Update Purpose after archive.
## Requirements
### Requirement: Una cuenta nueva recibe contenido de ejemplo en su primera entrada

Una cuenta SHALL recibir contenido de ejemplo la primera vez que entra a la aplicación:
un proyecto propio con tareas y un hábito.

El contenido SHALL estar creado **antes** de que se pinte la primera pantalla. NUNCA
SHALL aparecer después de que la pantalla ya se mostró vacía.

El contenido de ejemplo NUNCA SHALL crearse al registrarse, sino al entrar: una cuenta
que se registra y nunca confirma su correo NUNCA SHALL recibirlo.

#### Scenario: La primera pantalla ya tiene el contenido

- **WHEN** una cuenta recién creada entra por primera vez a la aplicación
- **THEN** el proyecto de ejemplo, sus tareas y el hábito de ejemplo ya existen al
  pintarse la primera pantalla

#### Scenario: Registrarse sin confirmar no siembra nada

- **WHEN** una cuenta se registra y nunca llega a entrar a la aplicación
- **THEN** NUNCA SHALL crearse contenido de ejemplo para esa cuenta

### Requirement: El contenido de ejemplo se crea exactamente una vez

El contenido de ejemplo SHALL crearse como máximo una vez por cuenta. La marca de que
ya se creó SHALL reclamarse con una actualización condicional atómica **antes** de crear
el contenido, de modo que dos entradas simultáneas NUNCA puedan sembrar dos veces.

Vaciar la cuenta, borrar el proyecto de ejemplo o borrar todas las tareas NUNCA SHALL
volver a producir contenido de ejemplo.

Las cuentas que ya existían antes de esta función NUNCA SHALL recibir contenido de
ejemplo.

#### Scenario: Dos pestañas al mismo tiempo no duplican el contenido

- **WHEN** una cuenta nueva entra por primera vez desde dos pestañas simultáneas
- **THEN** SHALL crearse un solo proyecto de ejemplo y un solo hábito de ejemplo

#### Scenario: Borrar los ejemplos no los trae de vuelta

- **WHEN** se borra el proyecto de ejemplo y se vuelve a entrar a la aplicación
- **THEN** NUNCA SHALL volver a crearse

#### Scenario: Una cuenta que ya existía no recibe nada

- **WHEN** una cuenta creada antes de esta función entra a la aplicación
- **THEN** NUNCA SHALL crearse contenido de ejemplo

### Requirement: Qué contiene el ejemplo

El contenido de ejemplo SHALL incluir un proyecto propio —NUNCA la Bandeja de entrada—
con al menos: una tarea con fecha, hora y prioridad ya asignadas; una tarea con
subtareas; una tarea con una etiqueta; y una tarea sin ningún atributo.

SHALL incluir además un hábito de ejemplo, creado **sin hora programada**, para que no
ocupe un horario del calendario que la persona no eligió.

SHALL incluir además un **filtro guardado de ejemplo**, marcado como favorito para que
aparezca en el panel lateral sin ir a buscarlo. Su consulta SHALL ser útil de verdad, no
una demostración de sintaxis. Los filtros son la función más potente y más invisible de
la aplicación: sin un ejemplo sembrado, una cuenta nueva puede no descubrirlos nunca.

Ninguna tarea de ejemplo SHALL tener texto de instructivo que se dirija a la persona
usuaria explicándole qué tocar: el contenido enseña por su forma, no por sus
indicaciones.

NUNCA SHALL mostrarse un recorrido guiado, globitos sobre la interfaz, pasos
obligatorios ni una lista de logros.

#### Scenario: El ejemplo muestra los atributos del parser ya aplicados

- **WHEN** se mira el proyecto de ejemplo de una cuenta nueva
- **THEN** al menos una tarea SHALL tener fecha, hora y prioridad asignadas

#### Scenario: El ejemplo incluye subtareas y una etiqueta

- **WHEN** se mira el proyecto de ejemplo
- **THEN** al menos una tarea SHALL tener subtareas
- **AND** al menos una tarea SHALL tener una etiqueta

#### Scenario: El ejemplo incluye un filtro guardado favorito

- **WHEN** se mira el contenido de ejemplo de una cuenta nueva
- **THEN** SHALL existir un filtro guardado marcado como favorito
- **AND** SHALL verse en el panel lateral sin necesidad de ir a la pantalla de filtros

#### Scenario: El hábito de ejemplo no tiene hora

- **WHEN** se mira el hábito de ejemplo de una cuenta nueva
- **THEN** SHALL ser un hábito de todo el día, sin hora programada

#### Scenario: No hay recorrido guiado

- **WHEN** una cuenta nueva entra por primera vez
- **THEN** NUNCA SHALL mostrarse un recorrido guiado ni globitos sobre la interfaz

### Requirement: Los ejemplos se borran todos juntos, con una acción

El proyecto de ejemplo SHALL ofrecer una acción que borre todo el contenido de ejemplo
de una vez: el proyecto con sus tareas, el hábito de ejemplo y el filtro de ejemplo.

El contenido de ejemplo SHALL identificarse por una marca propia en la fila, NUNCA por su
nombre: un nombre es editable y renombrar el proyecto dejaría el resto del contenido
huérfano y sin forma de encontrarlo.

La acción SHALL pedir confirmación explícita, igual que el borrado de un proyecto, y
NUNCA SHALL dejar el hábito de ejemplo suelto en la pantalla de Hábitos.

La acción SHALL vivir en el proyecto de ejemplo, NUNCA únicamente en Configuración.

#### Scenario: Borrar los ejemplos se lleva también el hábito

- **WHEN** se usa la acción de borrar los ejemplos desde el proyecto de ejemplo
- **THEN** el proyecto, sus tareas, el hábito y el filtro de ejemplo se borran
- **AND** NUNCA SHALL quedar el hábito de ejemplo en la pantalla de Hábitos
- **AND** NUNCA SHALL quedar el filtro de ejemplo en el panel lateral

#### Scenario: Renombrar el proyecto de ejemplo no rompe el borrado

- **WHEN** se renombra el proyecto de ejemplo y después se usa la acción de borrar los ejemplos
- **THEN** SHALL borrarse igual, porque el contenido se identifica por su marca y NUNCA por su nombre

#### Scenario: La acción pide confirmación

- **WHEN** se usa la acción de borrar los ejemplos
- **THEN** SHALL pedirse confirmación explícita antes de borrar nada

