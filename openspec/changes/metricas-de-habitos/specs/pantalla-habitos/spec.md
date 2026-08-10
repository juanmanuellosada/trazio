## MODIFIED Requirements

### Requirement: Contenido de la tarjeta de un hábito

Cada tarjeta de hábito SHALL mostrar su nombre, su ícono, un casillero para marcarlo únicamente cuando el día de hoy corresponde a su frecuencia, su frecuencia junto con el horario y la duración estimada, un mini-mapa de los últimos 14 días, su racha actual o su progreso semanal según su tipo de frecuencia, su mejor racha, su **constancia** (requirement "Constancia calculada sobre una ventana de 30 días") y su **contador de repeticiones** (requirement "Contador de repeticiones totales").

#### Scenario: Un hábito diario muestra racha actual

- **WHEN** se muestra la tarjeta de un hábito con frecuencia "todos los
  días"
- **THEN** la tarjeta muestra su racha actual en días, junto con nombre,
  ícono, horario, duración, mini-mapa de 14 días, mejor racha, constancia y
  repeticiones

#### Scenario: Un hábito de N veces por semana muestra progreso semanal en vez de racha de días

- **WHEN** se muestra la tarjeta de un hábito con `times_per_week = 3` que
  lleva 2 marcas en la semana en curso
- **THEN** la tarjeta muestra "2 de 3" como progreso semanal en lugar de
  una racha contada en días

#### Scenario: El casillero no aparece si el hábito no toca hoy

- **WHEN** un hábito de días específicos no tiene el día de hoy entre sus
  días configurados
- **THEN** su tarjeta no muestra casillero para marcar

## ADDED Requirements

### Requirement: Constancia calculada sobre una ventana de 30 días

La tarjeta de un hábito SHALL mostrar su **constancia**: la proporción de días cumplidos sobre los días que le tocaban en los últimos 30 días calendario, o menos días si el hábito tiene menos de 30 días de vida, contados desde `habits.created_at`. Ningún valor de constancia SHALL guardarse en una columna denormalizada: SHALL calcularse en cada lectura a partir de `habit_completions` y `habit_skips`, mismo criterio que D10 exige para la racha.

Un día dentro de la ventana con una fila en `habit_skips` SHALL excluirse del cálculo por completo, sin contar ni como cumplido ni como no cumplido — mismo criterio que ya rige que saltear no modifica la racha.

Si el día más reciente de la ventana es hoy, todavía no tiene marca y el día no terminó, SHALL excluirse de la ventana — mismo margen de gracia que ya aplica el cálculo de racha para el día en curso.

Para un hábito de frecuencia "todos los días" o "días específicos", la constancia SHALL expresarse como cantidad de días cumplidos sobre cantidad de días elegibles de la ventana (todo día para "todos los días"; únicamente los días de `days_of_week` para "días específicos"), después de aplicar las dos exclusiones anteriores.

Para un hábito de frecuencia "N veces por semana", la constancia NUNCA SHALL medirse en días: SHALL medirse en semanas cerradas (lunes a domingo, sin usar `user_preferences.week_starts_on`, mismo criterio que la racha semanal) dentro de la ventana de 30 días, excluyendo la semana de creación del hábito y la semana en curso — las mismas dos exclusiones que ya aplica el cálculo de racha semanal. La constancia SHALL expresarse como cantidad de semanas cerradas que alcanzaron `times_per_week` sobre cantidad total de semanas cerradas consideradas. Un salteo dentro de una semana MUST NOT alterar la cuenta de esa semana.

Si la ventana no tiene ningún día o ninguna semana elegible todavía, la tarjeta SHALL mostrar un aviso de que todavía no hay datos suficientes, en vez de una fracción.

#### Scenario: Un hábito diario con un día salteado no lo cuenta en contra

- **WHEN** un hábito diario de más de 30 días de vida tiene 27 marcas y 1
  salteo dentro de los últimos 30 días, sin marca en los 2 días restantes
- **THEN** la constancia se calcula como 27 de 29, no como 27 de 30

#### Scenario: Un hábito más joven que 30 días mide su constancia sobre su propia vida

- **WHEN** un hábito diario tiene 12 días de vida y 10 marcas
- **THEN** la constancia se calcula como 10 de 12, no como 10 de 30

#### Scenario: Hoy en curso sin marcar no baja la constancia

- **WHEN** un hábito diario tiene marca en los 29 días anteriores y hoy
  todavía no tiene marca ni terminó el día
- **THEN** la constancia se calcula sobre los 29 días anteriores, sin contar
  hoy todavía en el denominador

#### Scenario: Días específicos solo cuenta los días que corresponden

- **WHEN** un hábito de lunes, miércoles y viernes con más de 30 días de
  vida tuvo, en los últimos 30 días, 12 ocurrencias de esos tres días y
  marcó 10
- **THEN** la constancia se calcula como 10 de 12, no sobre los 30 días
  calendario

#### Scenario: N veces por semana se mide en semanas, no en días

- **WHEN** un hábito con `times_per_week = 3` tiene 4 semanas cerradas
  dentro de los últimos 30 días (sin contar la semana de creación ni la
  semana en curso), y alcanzó la meta en 3 de esas 4
- **THEN** la constancia se muestra como 3 de las últimas 4 semanas, nunca
  como una cuenta de días

#### Scenario: Sin datos suficientes se avisa en vez de mostrar una fracción vacía

- **WHEN** un hábito se creó hoy mismo, sin ningún día elegible cerrado
  todavía
- **THEN** la tarjeta muestra un aviso de que todavía no hay datos
  suficientes, en vez de "0 de 0"

### Requirement: Contador de repeticiones totales

La tarjeta de un hábito SHALL mostrar su cantidad total histórica de repeticiones: la cantidad de filas de `habit_completions` que tiene ese hábito, sin ventana de tiempo ni tope. Este contador NUNCA SHALL bajar salvo que se desmarque una repetición ya hecha, y MUST NOT guardarse en ninguna columna denormalizada: SHALL calcularse en cada lectura, mismo criterio que D10 exige para la racha.

#### Scenario: El contador de repeticiones no depende de ninguna ventana

- **WHEN** un hábito tiene 200 días de vida y 150 filas en
  `habit_completions`, muchas de ellas fuera de cualquier ventana de 14 o de
  30 días
- **THEN** el contador de repeticiones muestra 150

#### Scenario: Marcar un día pasado aumenta el contador

- **WHEN** se marca como hecho, desde el calendario, un día pasado que
  todavía no tenía marca
- **THEN** el contador de repeticiones del hábito aumenta en 1 en la
  siguiente lectura

### Requirement: Línea de referencia sobre la formación de hábitos al pie de la pantalla

La pantalla `/habitos` SHALL mostrar, una única vez y al pie de la pantalla —nunca repetida por tarjeta—, una línea de texto con la referencia a la investigación sobre formación de hábitos (Lally et al., 2010): la mediana de días hasta la automaticidad y que ese número varía mucho según la persona. Esta línea es la única mención de investigación o de plazos de formación de hábitos que SHALL existir en la pantalla; ningún otro texto motivacional, educativo o de progreso SHALL agregarse en ningún otro lugar de la pantalla ni de la tarjeta.

La pantalla NUNCA SHALL mostrar ningún gráfico, curva de progreso, puntaje, insignia, nivel ni comparación con otras personas u otros hábitos.

#### Scenario: La línea aparece una sola vez, sin importar la cantidad de hábitos

- **WHEN** el usuario tiene 8 hábitos activos en `/habitos`
- **THEN** la línea de referencia aparece una sola vez, al pie de la
  pantalla, no una vez por tarjeta

#### Scenario: No existe ningún gráfico de progreso

- **WHEN** se revisa la pantalla `/habitos` completa
- **THEN** no existe ningún componente de gráfico, curva, puntaje, insignia
  ni nivel
