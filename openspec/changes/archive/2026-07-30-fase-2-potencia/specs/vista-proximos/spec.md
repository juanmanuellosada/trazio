## ADDED Requirements

### Requirement: Ruta `/proximos`

La ruta `/proximos` SHALL existir y SHALL mostrar la vista Próximos. Esta ruta ya figuraba como protegida en `lib/supabase/proxy.ts` sin que la pantalla existiera.

#### Scenario: La ruta responde con la vista Próximos

- **WHEN** un usuario autenticado navega a `/proximos`
- **THEN** la aplicación muestra la vista Próximos, no una página de error
  ni una redirección

### Requirement: Ventana configurable, con 7 días por defecto

La vista Próximos SHALL mostrar una ventana de días hacia adelante, con un mínimo de una semana y un máximo de tres meses, configurable por el usuario. El valor por defecto SHALL ser 7 días.

#### Scenario: Ventana por defecto de 7 días

- **WHEN** un usuario abre Próximos por primera vez, sin haber configurado
  nada
- **THEN** la ventana muestra hoy más los 6 días siguientes (7 días en
  total)

#### Scenario: Ampliar la ventana a tres meses

- **WHEN** el usuario configura la ventana al máximo permitido
- **THEN** la vista muestra tareas hasta 3 meses hacia adelante desde hoy
- **AND** el sistema no permite configurar una ventana mayor a 3 meses ni
  menor a 1 semana

### Requirement: `default_view` acepta `proximos`

El check constraint de `user_preferences.default_view` SHALL admitir el valor `proximos` además de los valores que ya aceptaba en fase 1.

#### Scenario: Un usuario puede elegir Próximos como vista por defecto

- **WHEN** el usuario configura `proximos` como su vista de inicio en
  Configuración
- **THEN** el valor se guarda sin error en `user_preferences.default_view`
- **AND** al iniciar sesión, la aplicación abre en `/proximos`

### Requirement: Modo lista agrupado por día

En modo lista, la vista Próximos SHALL agrupar las tareas por día de vencimiento, con "Hoy" y "Mañana" resaltados visualmente frente al resto de los días. Cada grupo de día SHALL mostrar un contador de tareas y un botón para agregar una tarea precargada con la fecha de ese día.

#### Scenario: Hoy y mañana se destacan del resto

- **WHEN** la ventana de Próximos incluye tareas para hoy, para mañana y
  para pasado mañana
- **THEN** los grupos "Hoy" y "Mañana" se muestran con un estilo visual
  distinto al del resto de los grupos de día

#### Scenario: Cada día muestra su contador y su botón de agregar

- **WHEN** un día dentro de la ventana tiene 3 tareas
- **THEN** el grupo de ese día muestra el número 3 como contador
- **AND** ofrece un botón para agregar una tarea que precarga la fecha de
  vencimiento de ese día

### Requirement: Las tareas sin fecha quedan fuera de la lista

El modo lista de Próximos SHALL excluir las tareas que no tienen fecha de vencimiento asignada.

#### Scenario: Una tarea sin fecha no aparece en ningún grupo

- **WHEN** una tarea no tiene `due_date` ni `due_at`
- **THEN** esa tarea no aparece en ningún grupo de día del modo lista de
  Próximos

### Requirement: Las tareas atrasadas se muestran en un bloque propio, fuera de la ventana

La vista Próximos SHALL mostrar las tareas atrasadas (con fecha de vencimiento anterior a hoy y no completadas) en un bloque propio, ubicado arriba de todos los grupos de día, independientemente del tamaño de la ventana configurada.

#### Scenario: Una tarea atrasada aparece arriba, no en su día original

- **WHEN** existe una tarea vencida hace 3 días, todavía sin completar
- **THEN** esa tarea aparece en el bloque de atrasadas, arriba de todos los
  grupos de día
- **AND** no aparece agrupada bajo la fecha en la que venció

#### Scenario: Sin atrasadas, no se muestra el bloque

- **WHEN** el usuario no tiene ninguna tarea atrasada
- **THEN** la vista Próximos no muestra el bloque de atrasadas
