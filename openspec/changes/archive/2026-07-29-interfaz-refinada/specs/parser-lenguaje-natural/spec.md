## MODIFIED Requirements

### Requirement: El contrato canónico del parser

El parser SHALL cumplir el contrato canónico de `docs/parser-test-cases.md`,
sus casos numerados y sus reglas de desambiguación: si el parser no pasa un
caso de esa tabla, el parser está mal — no el caso. Este spec no duplica la
tabla; la referencia es la fuente de verdad y cualquier cambio a un caso se
hace primero ahí, según manda el propio archivo.

Las categorías del contrato son: fechas relativas, fechas puntuales, día de la
semana suelto, horas, duraciones, repetición y símbolos. Cada una tiene que
comportarse según lo que la tabla define para sus casos.

#### Scenario: Fecha relativa (categoría "fechas relativas", caso 2)

- **WHEN** el texto es `Comprar pan mañana`
- **THEN** el título SHALL quedar en `Comprar pan`
- **AND** `due_date` SHALL resolver a hoy+1

#### Scenario: Fecha puntual (categoría "fechas puntuales", caso 15)

- **WHEN** el texto es `Entrega 15/03`
- **THEN** el título SHALL quedar en `Entrega`
- **AND** `due_date` SHALL resolver al 15 de marzo, en su próxima ocurrencia (R1, R2)

#### Scenario: Día de la semana suelto (categoría "día de la semana suelto", caso 19)

- **WHEN** el texto es `Reunión lunes`
- **THEN** el título SHALL quedar en `Reunión`
- **AND** `due_date` SHALL resolver al próximo lunes

#### Scenario: Hora (categoría "horas", caso 23)

- **WHEN** el texto es `Dentista 3pm`
- **THEN** el título SHALL quedar en `Dentista`
- **AND** `due_at` SHALL resolver a hoy 15:00

#### Scenario: Duración (categoría "duraciones", caso 29)

- **WHEN** el texto es `Meditar por 45min`
- **THEN** el título SHALL quedar en `Meditar`
- **AND** `duration_minutes` SHALL ser 45

#### Scenario: Repetición (categoría "repetición", caso 36)

- **WHEN** el texto es `Gimnasio cada lunes`
- **THEN** el título SHALL quedar en `Gimnasio`
- **AND** el parser SHALL emitir el RRULE `FREQ=WEEKLY;BYDAY=MO`

#### Scenario: Símbolos (categoría "símbolos", caso 42)

- **WHEN** el texto es `Revisar diseño #Trabajo/En curso`
- **THEN** el título SHALL quedar en `Revisar diseño`
- **AND** el proyecto reconocido SHALL ser `Trabajo` y la sección `En curso`

### Requirement: R5 se precisa — "primera" es primera en el texto (E6)

Cuando R5 dice "gana la primera reconocida", esa prioridad SHALL ser el
orden de aparición del candidato en el texto, de izquierda a derecha, y no
el orden en que corren los reconocedores internamente. R5 SHALL aplicar por
atributo. La etiqueta (`@`) SHALL estar exenta de R5 porque las etiquetas son
multivaluadas. El proyecto (`#`) NO SHALL estar exento: una sola tarea admite
un solo proyecto.

#### Scenario: Gana el candidato que aparece primero en el texto

- **WHEN** el texto tiene dos candidatos para el mismo atributo en distintas
  posiciones
- **THEN** el parser SHALL preferir el que aparece más a la izquierda en el
  texto, sin importar el orden de ejecución interno de los reconocedores

#### Scenario: Las etiquetas son multivaluadas y no compiten entre sí (caso 43)

- **WHEN** el texto es `Comprar regalo @compras @urgente`
- **THEN** el título SHALL quedar en `Comprar regalo`
- **AND** SHALL reconocerse las dos etiquetas, `compras` y `urgente`, sin que
  R5 descarte ninguna

#### Scenario: El proyecto no es multivaluado

- **WHEN** el texto contiene dos tokens `#` distintos
- **THEN** el parser SHALL quedarse con el proyecto del primer token en el
  texto, y el segundo `#` NO SHALL producir un segundo proyecto

### Requirement: Tokenización de `@` y `#` (E7)

`@etiqueta` SHALL reconocerse desde el `@` hasta el primer espacio o símbolo.
`#` SHALL resolverse por coincidencia más larga contra la lista real de
proyectos y secciones del usuario que el parser recibe como entrada (E1). `/`
SHALL separar segmentos: primero se resuelve contra el árbol de proyectos (la
ruta más larga que coincida, hasta 3 niveles), y el segmento sobrante se
busca como sección dentro de ese proyecto. Ante empate entre un proyecto y
una sección con el mismo nombre, SHALL ganar el proyecto. La comparación
SHALL hacerse sin distinguir mayúsculas ni acentos, en las dos direcciones.

Es la inversión respecto del contrato original, donde `#` era etiqueta y `@`
era proyecto (casos 40, 41, 42, 43 y 53). El público del producto viene de
Todoist, que usa `#` para proyecto y sección y `@` para etiqueta; que el
símbolo haga lo que la persona espera vale más que la coherencia con el
hashtag de internet, sobre todo porque el error se descubre recién después de
haber creado la tarea mal.

#### Scenario: La etiqueta termina en el primer espacio (caso 40)

- **WHEN** el texto es `Comprar leche @compras`
- **THEN** el título SHALL quedar en `Comprar leche`
- **AND** la etiqueta reconocida SHALL ser `compras`

#### Scenario: Coincidencia más larga con espacio adentro del nombre (caso 42)

- **WHEN** el texto es `Revisar diseño #Trabajo/En curso`
- **AND** el proyecto `Trabajo` tiene una sección `En curso`
- **THEN** el proyecto reconocido SHALL ser `Trabajo` y la sección `En curso`,
  incluyendo el espacio dentro del nombre de la sección

#### Scenario: Empate entre proyecto y sección con el mismo nombre

- **WHEN** el usuario tiene un proyecto y una sección (de otro proyecto) con
  el mismo nombre, y el texto usa `#` seguido de ese nombre sin `/`
- **THEN** el parser SHALL resolver el token como el proyecto, no la sección

#### Scenario: Comparación sin mayúsculas ni acentos

- **WHEN** el texto usa `#Trabajo` o `@trabajo` en cualquier combinación de
  mayúsculas o con/sin acentos, y el usuario tiene un proyecto o etiqueta
  llamada `Trabajo`
- **THEN** el parser SHALL reconocer la coincidencia sin importar
  mayúsculas ni acentos

### Requirement: Las etiquetas se persisten en fase 1 (OQ1)

El `@` SHALL persistir, no solo reconocerse: al confirmar la creación de la
tarea, si la etiqueta no existe todavía para el usuario (comparando sin
acentos ni mayúsculas, según E7), el alta rápida SHALL crearla, SHALL
asignarla a la tarea, y SHALL mostrar su chip.

#### Scenario: `@` crea la etiqueta si no existe y la asigna (caso 40)

- **WHEN** el texto es `Comprar leche @compras`
- **AND** el usuario no tiene todavía una etiqueta `compras`
- **THEN** el título SHALL quedar en `Comprar leche`
- **AND** la etiqueta `compras` SHALL crearse y asignarse a la tarea
- **AND** su chip SHALL mostrarse en la tarea creada

### Requirement: Superficie de alta rápida

El campo de alta rápida SHALL resaltar en vivo lo que el parser reconoce
mientras el usuario escribe. Un doble clic sobre un resaltado SHALL
desactivarlo: el atributo asociado SHALL descartarse y el token SHALL volver
a ser texto común. Al confirmar la creación de la tarea, todo token
reconocido y no desactivado SHALL quitarse del título. Cuando el texto no usa
`#` para elegir un proyecto, el destino de la tarea SHALL ser el proyecto por
defecto configurado en las preferencias del usuario.

#### Scenario: Resaltado en vivo mientras se escribe

- **WHEN** el usuario escribe en el campo de alta rápida
- **THEN** cada atributo reconocido SHALL mostrarse resaltado en el campo,
  con el debounce de 120 ms de E2

#### Scenario: Doble clic descarta el atributo y libera el token

- **WHEN** el usuario hace doble clic sobre un token resaltado
- **THEN** el atributo asociado SHALL descartarse
- **AND** el token SHALL volver a mostrarse como texto común

#### Scenario: Confirmar quita del título los tokens reconocidos

- **WHEN** el usuario confirma la creación de la tarea
- **THEN** el título final SHALL excluir todo token que siga resaltado en ese
  momento
- **AND** SHALL incluir todo token que el usuario haya desactivado con doble
  clic

#### Scenario: Sin `#`, el destino es el proyecto por defecto

- **WHEN** el texto no contiene ningún token `#`
- **THEN** la tarea SHALL crearse en el proyecto por defecto configurado en
  las preferencias del usuario
