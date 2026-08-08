## ADDED Requirements

### Requirement: Las listas tienen un cursor que se mueve con las flechas

La forma de ver lista SHALL tener un **cursor**: a lo sumo una fila señalada a la vez, en
Bandeja de entrada, Hoy, Próximos, Proyecto, Etiqueta y Filtro. `↓` SHALL moverlo a la
fila siguiente y `↑` a la anterior. `Inicio` SHALL llevarlo a la primera fila y `Fin` a
la última.

Al entrar a una pantalla NUNCA SHALL haber cursor: SHALL aparecer recién al presionar
`↑` o `↓`, o al hacer clic en una fila. En los extremos el cursor NUNCA SHALL dar la
vuelta: `↑` en la primera fila y `↓` en la última no hacen nada.

El cursor NUNCA SHALL existir en la forma de ver panel ni en la de calendario.

#### Scenario: La flecha abajo señala la primera fila

- **WHEN** se entra a una lista con tareas y se presiona `↓`
- **THEN** la primera fila queda señalada

#### Scenario: El cursor no aparece solo

- **WHEN** se entra a una lista con tareas y no se presiona ninguna tecla
- **THEN** NUNCA SHALL haber ninguna fila señalada

#### Scenario: El cursor no da la vuelta

- **WHEN** el cursor está en la última fila y se presiona `↓`
- **THEN** el cursor SHALL quedarse en la última fila

#### Scenario: Inicio y Fin van a los extremos

- **WHEN** el cursor está en una fila del medio y se presiona `Fin`
- **THEN** el cursor SHALL quedar en la última fila de la lista

### Requirement: El cursor recorre la lista tal como se ve

El cursor SHALL recorrer las filas en el orden visual actual, respetando el orden y la
agrupación activos. Las filas que no se ven NUNCA SHALL recorrerse: las tareas de una
sección colapsada y las subtareas de una tarea plegada se saltean por completo.

Los encabezados de grupo y de sección NUNCA SHALL recibir el cursor.

Cambiar el orden o la agrupación SHALL cambiar el recorrido, sin que haga falta ninguna
configuración aparte.

#### Scenario: Una sección colapsada se saltea entera

- **WHEN** una lista agrupada por sección tiene la segunda sección colapsada y el cursor
  está en la última fila de la primera sección, y se presiona `↓`
- **THEN** el cursor SHALL saltar a la primera fila visible de la tercera sección

#### Scenario: Las subtareas plegadas no se recorren

- **WHEN** el cursor está en una tarea con subtareas plegadas y se presiona `↓`
- **THEN** el cursor SHALL ir a la tarea hermana siguiente, NUNCA a una subtarea oculta

#### Scenario: Los encabezados de grupo no reciben el cursor

- **WHEN** se recorre con `↓` una lista agrupada por prioridad
- **THEN** el cursor SHALL pasar solo por filas de tarea, NUNCA por los encabezados de
  cada grupo

#### Scenario: Cambiar la agrupación cambia el recorrido

- **WHEN** se cambia el agrupador de una lista de sección a prioridad
- **THEN** el cursor SHALL recorrer las filas en el nuevo orden visual

### Requirement: El cursor es foco real del navegador

El cursor SHALL implementarse con foco real: la fila señalada SHALL ser el elemento
enfocado del documento. La lista SHALL exponerse con la semántica de una lista de
opciones, y solo la fila señalada SHALL ser alcanzable con `Tab` — tabular NUNCA SHALL
recorrer fila por fila.

El cursor NUNCA SHALL ser un resaltado puramente visual sin foco asociado.

Al moverse, la fila señalada SHALL quedar visible en pantalla.

#### Scenario: La fila señalada tiene el foco del documento

- **WHEN** el cursor está en una fila
- **THEN** esa fila SHALL ser el elemento enfocado del documento

#### Scenario: Tab entra y sale de la lista de una

- **WHEN** el foco está antes de la lista y se presiona `Tab` dos veces
- **THEN** el foco SHALL entrar a la lista una sola vez y salir de ella, NUNCA recorrer
  una fila por cada pulsación

#### Scenario: El cursor se mantiene visible al moverse

- **WHEN** el cursor se mueve a una fila que está fuera del área visible
- **THEN** la lista SHALL desplazarse para que esa fila quede visible

### Requirement: Enter abre y Espacio completa la fila señalada

`Enter` SHALL abrir el detalle de la fila señalada. `Espacio` SHALL completarla o
descompletarla, según su estado.

`Espacio` NUNCA SHALL desplazar la página cuando hay una fila señalada.

Estas teclas NUNCA SHALL dispararse cuando el foco está en un campo de texto, incluido
el alta rápida en línea dentro de la misma lista.

#### Scenario: Enter abre el detalle

- **WHEN** el cursor está en una tarea y se presiona `Enter`
- **THEN** se abre el detalle de esa tarea

#### Scenario: Espacio completa la tarea señalada

- **WHEN** el cursor está en una tarea pendiente y se presiona `Espacio`
- **THEN** esa tarea queda completada

#### Scenario: Espacio no desplaza la página

- **WHEN** el cursor está en una tarea y se presiona `Espacio`
- **THEN** la página NUNCA SHALL desplazarse

#### Scenario: Espacio escribe un espacio en el alta rápida

- **WHEN** el foco está en el campo del alta rápida en línea de una lista y se presiona
  `Espacio`
- **THEN** se escribe un espacio en el campo
- **AND** NUNCA SHALL completarse ninguna tarea

### Requirement: El punto abre el menú de acciones de la fila señalada

`.` SHALL abrir el menú de acciones de la fila señalada, el mismo que abre el clic
derecho. `⇧F10` y la tecla Menú SHALL hacer lo mismo.

Con el menú abierto, los atajos del menú contextual de tarea que ya existen SHALL
aplicarse a esa fila. NUNCA SHALL agregarse un atajo nuevo por atributo que actúe
directamente sobre la fila señalada sin abrir el menú.

Al cerrarse el menú, el foco SHALL volver a la fila señalada.

#### Scenario: El punto abre el menú sobre la fila señalada

- **WHEN** el cursor está en una tarea y se presiona `.`
- **THEN** se abre el menú de acciones de esa tarea

#### Scenario: Los atajos del menú funcionan sobre la fila señalada

- **WHEN** con el menú abierto sobre la fila señalada se presiona `Y`
- **THEN** se abre el selector de prioridad de esa tarea

#### Scenario: Cerrar el menú devuelve el foco a la fila

- **WHEN** se cierra con `Escape` el menú abierto sobre la fila señalada
- **THEN** el foco SHALL volver a esa fila

### Requirement: El cursor sobrevive a que la lista cambie debajo

Cuando la lista cambia mientras hay un cursor, SHALL resolverse así:

- Si la fila señalada sigue en la lista, el cursor NUNCA SHALL moverse, aunque haya
  cambiado de posición.
- Si la fila señalada desapareció, el cursor SHALL pasar a la fila que ocupa esa misma
  posición; si la lista se acortó, a la última.
- Si la lista quedó vacía, NUNCA SHALL haber cursor.

#### Scenario: Completar la tarea señalada deja el cursor en su lugar

- **WHEN** el cursor está en la tercera fila de Hoy y esa tarea se completa y sale de la
  lista
- **THEN** el cursor SHALL quedar en la fila que pasó a ocupar la tercera posición

#### Scenario: Completar varias seguidas funciona sin tocar el mouse

- **WHEN** se presiona `Espacio` tres veces seguidas sobre una lista donde completar saca
  la tarea de la vista
- **THEN** las tres tareas SHALL completarse, sin que el cursor se pierda entre una y otra

#### Scenario: Reordenar la lista no arrastra el cursor

- **WHEN** un cambio en tiempo real reordena la lista y la fila señalada pasa de la
  segunda a la quinta posición
- **THEN** el cursor SHALL seguir en esa misma fila

#### Scenario: La última fila desaparecida lleva el cursor al final

- **WHEN** el cursor está en la última fila y esa fila desaparece
- **THEN** el cursor SHALL pasar a la que quedó última

#### Scenario: Una lista vacía se queda sin cursor

- **WHEN** desaparece la única fila de la lista
- **THEN** NUNCA SHALL haber ninguna fila señalada

### Requirement: El cursor no se guarda ni sobrevive a la navegación

El cursor SHALL vivir en la pantalla y perderse al salir de ella. NUNCA SHALL guardarse
en las preferencias de vista, en la URL, ni restaurarse al volver.

#### Scenario: Volver a una pantalla no restaura el cursor

- **WHEN** se señala una fila en Hoy, se navega a Próximos y se vuelve a Hoy
- **THEN** NUNCA SHALL haber ninguna fila señalada al volver

### Requirement: El cursor se distingue de la selección múltiple

El cursor y la selección múltiple SHALL tener tratamientos visuales distintos, y una
misma fila SHALL poder estar señalada y seleccionada a la vez sin ambigüedad.

#### Scenario: Una fila señalada y seleccionada se distingue de las dos cosas

- **WHEN** una fila está señalada por el cursor y además seleccionada
- **THEN** SHALL verse que está señalada y que está seleccionada, con dos tratamientos
  visuales distinguibles entre sí
