# parser-lenguaje-natural Specification

## Purpose
TBD - created by archiving change fase-1-base-usable. Update Purpose after archive.
## Requirements
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

### Requirement: R1 — Formato de fecha, día primero, siempre

El parser SHALL interpretar toda fecha numérica con el día primero. No existe
interpretación mes-primero, ni siquiera cuando ambos números son menores a 13.

#### Scenario: Ambigüedad día/mes resuelta a favor del día (caso 18)

- **WHEN** el texto es `Reunión 05/06`
- **THEN** `due_date` SHALL resolver al 5 de junio
- **AND** el parser NUNCA SHALL interpretarlo como el 6 de mayo

### Requirement: R2 — Año omitido resuelve a la próxima ocurrencia

Cuando una fecha puntual no incluye año, el parser SHALL resolverla a la
próxima ocurrencia de esa fecha. NUNCA SHALL resolver a una fecha anterior a
`ahora`.

#### Scenario: Fecha sin año ya pasada este año (caso 12)

- **WHEN** el texto es `Cumpleaños de Ana 15 de marzo`
- **AND** el 15 de marzo del año en curso ya pasó respecto de `ahora`
- **THEN** `due_date` SHALL resolver al 15 de marzo del año siguiente
- **AND** el parser NUNCA SHALL resolver a un 15 de marzo anterior a `ahora`

### Requirement: R3 — Hora sin AM/PM

Cuando una hora se escribe sin indicar AM/PM, el parser SHALL interpretar las
horas 1 a 7 como PM y las horas 8 a 12 como AM. Es la interpretación que
acierta más seguido en el uso cotidiano.

#### Scenario: Hora vespertina implícita (caso 25)

- **WHEN** el texto es `Reunión a las 3`
- **THEN** `due_at` SHALL resolver a hoy 15:00

#### Scenario: Hora matutina implícita (caso 26)

- **WHEN** el texto es `Reunión a las 9`
- **THEN** `due_at` SHALL resolver a hoy 09:00

### Requirement: R4 — Día de la semana suelto solo como último recurso

Un nombre de día suelto NO SHALL interpretarse como fecha si el texto ya tiene
una fecha reconocida por otra vía.

#### Scenario: Día suelto ignorado porque ya hay una fecha (caso 21)

- **WHEN** el texto es `Reunión el 20/08 con el equipo del lunes`
- **THEN** `due_date` SHALL resolver al 20 de agosto
- **AND** la palabra "lunes" NO SHALL producir ningún atributo

### Requirement: R5 — Un solo valor por atributo

Si el texto contiene dos candidatos para el mismo atributo, el parser SHALL
quedarse con el primero reconocido y el segundo SHALL quedar como texto común
en el título.

#### Scenario: Dos fechas en el mismo texto

- **WHEN** el texto contiene dos expresiones de fecha distintas para el
  atributo `due_date`
- **THEN** el parser SHALL asignar `due_date` según la primera y SHALL dejar
  la segunda expresión como texto sin remover del título

### Requirement: R6 — Números sueltos no son fechas

Un número solo SHALL interpretarse como fecha únicamente si viene acompañado
de un marcador (`en 3 días`, `15 de marzo`, `15/03`). Un número suelto, sin
marcador, NO SHALL producir ningún atributo.

#### Scenario: Cantidad sin marcador de fecha (caso 47)

- **WHEN** el texto es `Comprar 3 manzanas`
- **THEN** el título SHALL quedar intacto en `Comprar 3 manzanas`
- **AND** ningún atributo SHALL extraerse

### Requirement: R7 — El resaltado es reversible

Todo token reconocido SHALL mostrarse resaltado en el campo de alta rápida.
Un doble clic sobre el resaltado SHALL desactivarlo: el token vuelve a ser
texto común y el atributo que había producido SHALL descartarse.

#### Scenario: Doble clic desactiva un token resaltado

- **WHEN** un token quedó resaltado por haber producido un atributo
- **AND** el usuario hace doble clic sobre ese resaltado
- **THEN** el resaltado SHALL desaparecer
- **AND** el atributo asociado SHALL descartarse
- **AND** el texto del token SHALL permanecer en el título como texto común

### Requirement: Casos críticos — "la mañana" vs. "mañana"

El parser SHALL distinguir siempre "la mañana" / "esta mañana" (un momento
del día) de "mañana" (el día siguiente) — el criterio de aceptación literal
de la fase 1. Los casos 46 y 50 son el par mínimo: la única diferencia léxica
entre `Terminar el informe de la mañana` y `Preparar la reunión de mañana` es
el artículo "la", y por eso ninguno de los cuatro casos siguientes es
opcional.

A "esta mañana" (caso 45) NO SHALL asignársele franja horaria matutina
(ningún componente de hora). Asignarle una hora inventaría precisión que el
usuario no pidió, ocuparía un bloque de calendario que nadie agendó, y
habilitaría recordatorios relativos calculados sobre una hora ficticia.

#### Scenario: "a la mañana" no es una fecha (caso 44)

- **WHEN** el texto es `Salir a correr a la mañana`
- **THEN** el título SHALL quedar intacto en `Salir a correr a la mañana`
- **AND** ningún atributo SHALL extraerse

#### Scenario: "esta mañana" es hoy, sin hora (caso 45)

- **WHEN** el texto es `Reunión esta mañana`
- **THEN** el título SHALL quedar en `Reunión`
- **AND** `due_date` SHALL resolver a hoy
- **AND** el resultado NO SHALL incluir ningún componente de hora

#### Scenario: "de la mañana" no es una fecha (caso 46)

- **WHEN** el texto es `Terminar el informe de la mañana`
- **THEN** el título SHALL quedar intacto en `Terminar el informe de la mañana`
- **AND** ningún atributo SHALL extraerse

#### Scenario: "de mañana" sí es el día siguiente (caso 50)

- **WHEN** el texto es `Preparar la reunión de mañana`
- **THEN** el título SHALL quedar en `Preparar la reunión`
- **AND** `due_date` SHALL resolver a hoy+1

### Requirement: Principio rector — ante ambigüedad, extraer menos

Decisión del dueño del proyecto: cuando el texto es ambiguo, el parser SHALL
preferir siempre la interpretación que extrae menos atributos, o ninguno. Un
atributo de menos lo corrige el usuario en dos segundos; uno de más lo
descubre cuando le suena una notificación que no esperaba. Toda regla de
desambiguación de este documento se resuelve en esa dirección.

#### Scenario: Ordinal ambiguo no se adivina (caso 52)

- **WHEN** el texto es `Pagar el alquiler el 1`
- **THEN** el título SHALL quedar intacto en `Pagar el alquiler el 1`
- **AND** ningún atributo SHALL extraerse, porque un número ordinal solo es
  ambiguo y el parser no adivina

### Requirement: Función pura, sin reloj propio (E1)

El parser SHALL exponer una función pura `parse(texto, { ahora, zonaHoraria,
semanaEmpiezaEn, proyectos, etiquetas })`. El parser NUNCA SHALL leer
`Date.now()` ni el `Intl` del sistema operativo o del entorno de ejecución.
Es lo que garantiza tests deterministas y que "mañana a las 10" se resuelva
en la zona horaria IANA del usuario, y no en la del servidor.

#### Scenario: El resultado depende solo del contexto explícito

- **WHEN** se invoca `parse` dos veces con el mismo texto y el mismo objeto de
  contexto, en momentos reales distintos y en procesos distintos
- **THEN** el resultado SHALL ser idéntico en ambas invocaciones
- **AND** cambiar `zonaHoraria` en el contexto SHALL cambiar la fecha
  resuelta para textos como "mañana a las 10" cuando corresponda al cambio de
  día en esa zona

### Requirement: El parser nunca tira excepciones (E2)

Ante cualquier entrada, el peor resultado posible SHALL ser el texto entero
como título, sin ningún atributo. `parse` SHALL estar envuelto en un borde
que garantiza esa salida. El parser corre en el cliente, en cada tecla, con
un debounce de 120 ms.

#### Scenario: Entrada rara no rompe el parser

- **WHEN** se invoca `parse` con una entrada malformada o inesperada (texto
  vacío, solo símbolos, caracteres de control)
- **THEN** `parse` NO SHALL tirar ninguna excepción
- **AND** el resultado SHALL ser, como mínimo, el texto de entrada como
  título sin atributos

### Requirement: Reconocedores independientes y resolución por prioridad (E3)

Cada reconocedor de categoría SHALL ser independiente y SHALL devolver
candidatos con su rango de caracteres en el texto (fecha relativa, fecha
puntual, día suelto, hora, duración, repetición, símbolos). Una fase de
resolución posterior SHALL ordenar esos candidatos, aplicar R4 y R5, descartar
a los perdedores, y solo entonces remover del título los rangos de los
candidatos ganadores.

#### Scenario: La resolución decide antes de tocar el título (caso 21)

- **WHEN** el texto es `Reunión el 20/08 con el equipo del lunes`
- **THEN** los reconocedores SHALL producir candidatos independientes para
  `20/08` (fecha puntual) y `lunes` (día suelto)
- **AND** la fase de resolución SHALL aplicar R4 y descartar el candidato de
  `lunes` antes de remover ningún rango del título
- **AND** solo el rango de `20/08` SHALL removerse del título final

### Requirement: R8 — Qué preposición o artículo se lleva el token (E4)

La preposición o el artículo SHALL consumirse como parte del token únicamente
cuando son parte léxica de la locución que desambigua (`de mañana`, `esta
mañana`, `pasado mañana`, `este fin de semana`, `próxima semana`, `en 3
días`, `a las 3`, `por 45min`, `cada lunes`). Un determinante suelto delante
de una fecha numérica o nominal (`el 15 de marzo`, `el 20/08`) NO SHALL
considerarse parte del token y SHALL quedar en el título. Al remover un rango
del medio del texto, los espacios se normalizan (las secuencias de espacio
colapsan a uno y se recortan los extremos), pero los artículos huérfanos NO
SHALL tocarse.

#### Scenario: Artículo suelto delante de fecha con hora (caso 14)

- **WHEN** el texto es `Vence el 15 de marzo de 2027`
- **THEN** el título SHALL quedar en `Vence el`
- **AND** `due_date` SHALL resolver a 2027-03-15

#### Scenario: Artículo huérfano intacto tras remover el token (caso 21)

- **WHEN** el texto es `Reunión el 20/08 con el equipo del lunes`
- **THEN** el título SHALL quedar en `Reunión el con el equipo del lunes`
- **AND** los artículos "el" y "del" NO SHALL removerse ni alterarse

#### Scenario: Preposición léxica de la locución sí se consume (caso 50)

- **WHEN** el texto es `Preparar la reunión de mañana`
- **THEN** el título SHALL quedar en `Preparar la reunión`
- **AND** la preposición "de" SHALL removerse junto con "mañana" por ser parte
  léxica de la locución "de mañana"

### Requirement: R9 — "Próxima semana" según `week_starts_on`

"Próxima semana" SHALL resolver al primer día de la semana siguiente según el
`week_starts_on` configurado en las preferencias del usuario (E1), no a un
lunes fijo. El caso 6 del contrato asume el valor por defecto de
`week_starts_on` (lunes); con otro valor configurado, el resultado cambia en
consecuencia.

#### Scenario: "Próxima semana" con la semana empezando en lunes (caso 6, default)

- **WHEN** el texto es `Enviar informe próxima semana`
- **AND** `week_starts_on` es `1` (lunes, el default)
- **THEN** el título SHALL quedar en `Enviar informe`
- **AND** `due_date` SHALL resolver al lunes de la semana siguiente

#### Scenario: "Próxima semana" con la semana empezando en domingo

- **WHEN** el texto es `Enviar informe próxima semana`
- **AND** `week_starts_on` es `0` (domingo)
- **THEN** el título SHALL quedar en `Enviar informe`
- **AND** `due_date` SHALL resolver al domingo de la semana siguiente

### Requirement: R10 — Asimetría al resolver una fecha relativa que cae hoy

El parser SHALL resolver un día de la semana suelto ("lunes", "próximo
lunes") siempre a la próxima ocurrencia, nunca a hoy, aunque hoy sea ese
mismo día — quien quiere hoy escribe "hoy". El parser SHALL resolver un
tramo del fin de semana ("este fin de semana") a hoy cuando hoy ya es sábado
o domingo, porque ahí la lectura literal de "este" coincide con la
expectativa del usuario. La asimetría es deliberada: "lunes" nombra un día
puntual que, dicho un lunes, es ambiguo entre "hoy" y "el lunes que viene", y
E0 manda resolver la ambigüedad con la lectura que nunca se confunde con
"hoy"; "este fin de semana" dicho en fin de semana no tiene esa ambigüedad,
porque el fin de semana en curso ya empezó.

#### Scenario: "lunes" y "próximo lunes" dichos un lunes nunca resuelven a hoy

- **WHEN** el texto es `Reunión lunes` o `Reunión próximo lunes`
- **AND** hoy es lunes
- **THEN** `due_date` SHALL resolver a hoy+7
- **AND** `due_date` NUNCA SHALL resolver a hoy

#### Scenario: "este fin de semana" dicho en fin de semana resuelve a hoy

- **WHEN** el texto es `Salir este fin de semana`
- **AND** hoy es sábado o domingo
- **THEN** `due_date` SHALL resolver a hoy

### Requirement: R11 — Palabras clave de fecha, sin acentos ni mayúsculas

El reconocedor de fechas relativas SHALL comparar sus palabras clave
(`mañana`, `hoy`, `ayer`, etc.) sin distinguir mayúsculas ni acentos, igual
que E7 ya exige para `@` y `#`. Una entrada sin tildes o en mayúsculas SHALL
resolver igual que su forma canónica.

#### Scenario: "manana" sin tilde resuelve como "mañana" (caso nuevo)

- **WHEN** el texto es `Comprar pan manana`
- **THEN** el título SHALL quedar en `Comprar pan`
- **AND** `due_date` SHALL resolver a hoy+1

#### Scenario: "MAÑANA" en mayúsculas resuelve como "mañana" (caso nuevo)

- **WHEN** el texto es `Comprar pan MAÑANA`
- **THEN** el título SHALL quedar en `Comprar pan`
- **AND** `due_date` SHALL resolver a hoy+1

### Requirement: R12 — Un prefijo incompleto no dispara reconocimiento

Un prefijo incompleto de una palabra clave NO SHALL producir ningún
atributo: el reconocedor SHALL exigir la palabra completa, no un prefijo,
porque el parser corre en cada tecla (E2) y un prefijo incompleto es la
situación normal mientras el usuario todavía está escribiendo.

#### Scenario: Prefijo incompleto de "mañana" no reconoce nada (caso nuevo)

- **WHEN** el texto es `Comprar pan mañ`
- **THEN** el título SHALL quedar intacto en `Comprar pan mañ`
- **AND** ningún atributo SHALL extraerse

### Requirement: Hora ya pasada, sin rollover (E5)

El parser NO SHALL correr la fecha al día siguiente cuando la hora reconocida
ya pasó respecto de `ahora` en el mismo día. La tarea SHALL quedar vencida en
el día resuelto.

#### Scenario: Hora pasada queda vencida hoy, no se mueve a mañana (caso 23)

- **WHEN** el texto es `Dentista 3pm`
- **AND** `ahora` son las 18:00 del mismo día
- **THEN** `due_at` SHALL resolver a hoy 15:00
- **AND** el parser NO SHALL correr la fecha a mañana

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

### Requirement: Año de dos dígitos siempre es 20YY (E8)

Cuando una fecha puntual usa año de dos dígitos, el parser SHALL
interpretarlo siempre como `20YY`. No hay pivote de siglo.

#### Scenario: Año corto resuelve al siglo XXI (caso 17)

- **WHEN** el texto es `Entrega 15-03-27`
- **THEN** `due_date` SHALL resolver a 2027-03-15

### Requirement: Un candidato descartado no se resalta (E9)

El resaltado SHALL aplicarse únicamente a los rangos que produjeron un
atributo tras la fase de resolución. Un candidato que fue considerado y
luego descartado (por R4, R5 o cualquier otra regla) NO SHALL mostrarse
resaltado.

#### Scenario: "lunes" descartado por R4 no se resalta (caso 21)

- **WHEN** el texto es `Reunión el 20/08 con el equipo del lunes`
- **THEN** SHALL resaltarse únicamente el rango `20/08`
- **AND** la palabra "lunes" NO SHALL mostrarse resaltada, pese a haber sido
  considerada como candidato

### Requirement: "deadline" no tiene token en fase 1 (E11)

El parser NO SHALL reconocer ninguna palabra (incluyendo "vence") como el
atributo `deadline`. En fase 1, `deadline` SHALL cargarse únicamente desde el
detalle de la tarea, nunca desde el alta rápida.

#### Scenario: "vence" no produce el atributo deadline (caso 14)

- **WHEN** el texto es `Vence el 15 de marzo de 2027`
- **THEN** el atributo extraído SHALL ser `due_date`, no `deadline`
- **AND** `deadline` SHALL quedar sin valor hasta que se cargue desde el
  detalle de la tarea

### Requirement: Recurrencia: ancla de fecha solo si hay hora reconocida (E12)

La recurrencia sola NO SHALL fijar una fecha ancla: los casos 31 a 37 SHALL
producir únicamente un RRULE en `recurrence_rule`, sin que el parser invente
un `due_date` ni un `due_at`. Cuando el texto combina una regla de
recurrencia con una hora reconocida, el parser SHALL fijar `due_at` en la
próxima ocurrencia que cumple la regla, porque descartar la hora en silencio
sería perder un atributo ya reconocido, y eso el contrato no lo permite. El
RRULE SHALL guardarse en `recurrence_rule`. Que el parser no fije
`due_date`/`due_at` a partir de la recurrencia sola no significa que nadie
interprete esa regla: la capacidad `tareas-recurrentes` SHALL leerla al
completar una tarea recurrente para generar su siguiente ocurrencia, según el
ancla que determina el propio RRULE.

#### Scenario: Recurrencia sola no inventa ancla (caso 36)

- **WHEN** el texto es `Gimnasio cada lunes`
- **THEN** el título SHALL quedar en `Gimnasio`
- **AND** SHALL emitirse el RRULE `FREQ=WEEKLY;BYDAY=MO`
- **AND** ni `due_date` ni `due_at` SHALL tener valor

#### Scenario: Recurrencia con hora sí fija ancla (caso nuevo)

- **WHEN** el texto es `Gimnasio cada lunes a las 8`
- **THEN** el título SHALL quedar en `Gimnasio`
- **AND** SHALL emitirse el RRULE `FREQ=WEEKLY;BYDAY=MO`
- **AND** `due_at` SHALL resolver al próximo lunes 08:00 (R3: la hora 8 es AM)

### Requirement: La suite de tests es el contrato ejecutable (E10, E14)

`lib/parser/casos.ts` SHALL ser un módulo de datos que refleja 1 a 1 la tabla
de `docs/parser-test-cases.md`, y `lib/parser/parser.test.ts` SHALL recorrer
ese módulo. La suite SHALL incluir un test que compare los números de fila de
la tabla en `docs/parser-test-cases.md` con los `numero` de
`lib/parser/casos.ts`, para que el markdown y el código no puedan divergir
en silencio. Los tests SHALL escribirse con el primer commit del parser,
antes de la lógica, empezando por los casos 44 a 52. R7 (resaltado
reversible), al ser de interfaz y no de parsing, SHALL probarse aparte con
tests de componente sobre el alta rápida. La suite SHALL congelar el reloj y
SHALL correr tanto en `America/Argentina/Buenos_Aires` como en
`Pacific/Kiritimati` (E13).

#### Scenario: El conteo de casos falla si el markdown y el código divergen

- **WHEN** se agrega, quita o modifica un caso en `docs/parser-test-cases.md`
  sin actualizar `lib/parser/casos.ts` en consecuencia
- **THEN** el test que compara los números de fila del markdown con los
  `numero` de `casos.ts` SHALL fallar

#### Scenario: La suite corre en dos zonas horarias con el reloj congelado

- **WHEN** se ejecuta `lib/parser/parser.test.ts`
- **THEN** SHALL correr con el reloj congelado
- **AND** SHALL correr tanto en `America/Argentina/Buenos_Aires` como en
  `Pacific/Kiritimati`

#### Scenario: R7 se prueba con tests de componente, no en la suite del parser

- **WHEN** se verifica el comportamiento de R7 (resaltado reversible)
- **THEN** SHALL verificarse con tests de componente sobre la superficie de
  alta rápida, no como un caso dentro de `lib/parser/casos.ts`

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

### Requirement: El RRULE determina el ancla de la recurrencia (D-D)

El RRULE que produce el parser SHALL determinar también el ancla desde la que
se calcula la siguiente ocurrencia de una tarea recurrente, sin ninguna
columna ni control adicional. Una regla anclada al calendario —que declara
`BYDAY`, `BYMONTHDAY` o `BYMONTH`— SHALL anclarse en la fecha de vencimiento
original de la tarea. Una regla de intervalo puro —`FREQ` con `INTERVAL` y
sin ningún componente `BY*`— SHALL anclarse en la fecha en la que se
completó la tarea.

#### Scenario: Una regla anclada al calendario usa el vencimiento como ancla

- **WHEN** una tarea recurrente tiene el RRULE `FREQ=WEEKLY;BYDAY=MO` ("cada
  lunes")
- **THEN** la siguiente ocurrencia SHALL calcularse desde la fecha de
  vencimiento original de la tarea, no desde la fecha en la que se completó

#### Scenario: Una regla de intervalo puro usa la fecha de completado como ancla

- **WHEN** una tarea recurrente tiene el RRULE `FREQ=DAILY;INTERVAL=3` ("cada
  3 días", sin ningún componente `BY*`)
- **THEN** la siguiente ocurrencia SHALL calcularse desde la fecha en la que
  se completó la tarea, no desde su fecha de vencimiento original

