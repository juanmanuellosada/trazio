# rachas-de-habitos Specification

## Purpose
TBD - created by archiving change fase-3-habitos. Update Purpose after archive.
## Requirements
### Requirement: La racha se calcula en cada lectura y no se guarda denormalizada

La racha actual y la mejor racha de un hábito SHALL calcularse a partir de `habit_completions` en cada lectura, mediante una función `SECURITY INVOKER`, y MUST NOT guardarse en ninguna columna denormalizada de `habits`.

#### Scenario: Borrar una marca antigua cambia la racha en la siguiente lectura

- **WHEN** se borra una fila de `habit_completions` que formaba parte de la
  racha actual de un hábito
- **THEN** la siguiente lectura de la racha refleja ese borrado de
  inmediato, sin ningún proceso de sincronización ni recálculo manual

### Requirement: Racha de "todos los días": días consecutivos con margen de gracia hoy

Un hábito con frecuencia "todos los días" SHALL calcular su racha actual como la cantidad de días consecutivos con marca contando hacia atrás desde ayer cuando hoy todavía no tiene marca y el día no terminó, y la racha SHALL ser 0 si tampoco hay marca ayer.

#### Scenario: Hoy sin marcar todavía no corta la racha

- **WHEN** un hábito diario tiene marca en 2026-07-28, 2026-07-29 y
  2026-07-30, y hoy es 2026-07-31, sin marcar todavía y sin que el día haya
  terminado
- **THEN** la racha actual se calcula en 3, contando hacia atrás desde
  2026-07-30

#### Scenario: Sin marca ayer, la racha es 0

- **WHEN** un hábito diario no tiene marca ni el 2026-07-30 (ayer) ni el
  2026-07-31 (hoy, en curso)
- **THEN** la racha actual es 0

### Requirement: Racha de "días específicos": solo cuentan los días configurados, con el mismo margen de gracia

Un hábito con frecuencia "días específicos" SHALL contar únicamente los días de `days_of_week` configurados, un día específico sin marca SHALL cortar la racha recién cuando ese día terminó, y mientras el día específico en curso no haya terminado SHALL tratarse como todavía cumplible.

#### Scenario: Un día específico en curso sin marcar no corta la racha

- **WHEN** un hábito configurado para lunes, miércoles y viernes tiene
  marca el lunes 2026-07-27 y el miércoles 2026-07-29, y hoy es viernes
  2026-07-31 (día específico), sin marcar todavía y sin haber terminado
- **THEN** la racha actual sigue en 2, sin cortarse por el viernes en curso

#### Scenario: Un día específico que ya terminó sin marca corta la racha

- **WHEN** ese mismo hábito llega al sábado 2026-08-01 sin haberse marcado
  el viernes 2026-07-31, que ya terminó
- **THEN** la racha actual se corta a 0

### Requirement: Racha de "N veces por semana": se mide en semanas cumplidas, no en días

Un hábito con frecuencia "N veces por semana" SHALL contar como racha actual la cantidad de semanas consecutivas y cerradas en las que la cantidad de marcas alcanzó `times_per_week`.

#### Scenario: Dos semanas consecutivas que cumplen la meta

- **WHEN** un hábito con `times_per_week = 3` tiene 3 marcas en la semana
  del 2026-07-13 al 2026-07-19 y 3 marcas en la semana del 2026-07-20 al
  2026-07-26, ambas ya cerradas
- **THEN** la racha actual, en semanas, es 2

#### Scenario: Una semana que no llega a la meta corta la racha

- **WHEN** la semana del 2026-07-20 al 2026-07-26 tiene solo 2 marcas en
  vez de las 3 que exige `times_per_week`
- **THEN** esa semana corta la racha, y la próxima semana cerrada que sí
  cumpla la meta vuelve a arrancar la racha en 1

### Requirement: La semana es siempre de lunes a domingo, sin importar `week_starts_on`

El cómputo de semanas para "N veces por semana" SHALL usar siempre lunes a domingo como corte de semana, y MUST NOT usar `user_preferences.week_starts_on` para este cálculo, aunque esa preferencia mueva el inicio de semana en el resto de la aplicación.

#### Scenario: Un usuario con la semana configurada en domingo igual corta en domingo para hábitos

- **WHEN** `user_preferences.week_starts_on` de un usuario está en `0`
  (domingo)
- **THEN** la racha semanal de sus hábitos igual considera cerrada la
  semana el domingo por la noche, sin adelantar el corte al sábado

### Requirement: La semana en curso no entra en la racha hasta que cierra el domingo

Para "N veces por semana", la semana en curso MUST NOT sumarse a la racha hasta que termine el domingo, y SHALL mostrarse aparte como progreso, con la cantidad de marcas alcanzadas sobre la meta.

#### Scenario: La semana en curso se muestra como progreso, no como racha

- **WHEN** un hábito con `times_per_week = 3` tiene 1 marca en la semana en
  curso, que va del lunes 2026-07-27 al domingo 2026-08-02, y hoy es
  miércoles 2026-07-29
- **THEN** esa semana se muestra como progreso "1 de 3" y no se suma a la
  racha actual, aunque las semanas anteriores sí hayan cumplido la meta

### Requirement: La mejor racha histórica es el máximo entre todas las rachas que tuvo el hábito

La mejor racha SHALL calcularse como el valor máximo entre todas las rachas consecutivas que el hábito tuvo a lo largo de todo su historial, incluida la racha actual cuando ya superó a las anteriores.

#### Scenario: La racha actual supera a la mejor histórica previa

- **WHEN** un hábito tuvo una racha máxima histórica de 5 días y su racha
  actual llega a 6
- **THEN** la mejor racha mostrada pasa a ser 6

#### Scenario: Una racha cortada en el pasado sigue siendo la mejor

- **WHEN** un hábito tuvo una racha de 20 días que se cortó, y su racha
  actual es de 3 días
- **THEN** la mejor racha mostrada sigue siendo 20

### Requirement: La semana de creación del hábito se excluye del cómputo de "N veces por semana"

La semana calendario en la que se creó un hábito con frecuencia "N veces por semana" MUST NOT evaluarse contra `times_per_week`, ni contarse como semana cumplida ni como semana fallida, y la meta MUST NOT prorratearse a los días que quedaban de esa semana.

#### Scenario: Un hábito creado un jueves no falla su primera semana parcial

- **WHEN** un hábito con `times_per_week = 3` se crea el jueves 2026-07-30,
  dentro de la semana del 2026-07-27 al 2026-08-02, y solo alcanza 1 marca
  antes de que esa semana termine
- **THEN** esa semana no cuenta como fallida ni corta ninguna racha, y el
  cómputo de racha empieza recién con la primera semana completa siguiente

### Requirement: Ningún tipo de racha evalúa fechas anteriores a la creación del hábito

El cálculo de racha, para los tres tipos de frecuencia, MUST NOT considerar ninguna fecha anterior a `habits.created_at`.

#### Scenario: Un hábito no arrastra días sin marcar previos a su creación

- **WHEN** un hábito diario se crea el 2026-07-29 y tiene marca los días
  2026-07-29, 2026-07-30 y 2026-07-31
- **THEN** la racha actual es 3, sin descontar por la ausencia de marcas en
  fechas anteriores al 2026-07-29

### Requirement: Desarchivar reinicia la racha actual en cero, sin tocar la mejor racha ni el historial

Al desarchivar un hábito, la racha actual SHALL recalcularse en 0 porque el período archivado interrumpe la continuidad, mientras que la mejor racha histórica y todos los registros de `habit_completions` SHALL permanecer intactos.

#### Scenario: Desarchivar un hábito con una racha activa antes de archivarlo

- **WHEN** un hábito tenía una racha actual de 10 días al momento de
  archivarse, permanece archivado dos semanas y luego se desarchiva
- **THEN** su racha actual recalculada es 0
- **AND** su mejor racha histórica sigue mostrando el máximo alcanzado
  antes de archivarse, y todas sus marcas anteriores siguen visibles en su
  mini-mapa

### Requirement: "Hoy", "el día terminó" y "la semana cerró" se resuelven en la zona horaria del usuario

Todo el cálculo de racha SHALL determinar qué día es "hoy", cuándo un día terminó y cuándo una semana cerró usando `user_preferences.timezone`, reusando el mismo mecanismo que ya resuelve las tareas atrasadas.

#### Scenario: Dos usuarios en zonas horarias distintas ven "hoy" en un momento distinto

- **WHEN** son las 23:30 UTC del 2026-07-30, un usuario tiene `timezone`
  en `America/Argentina/Buenos_Aires` (UTC-3) y otro lo tiene en
  `Europe/Madrid` (UTC+2)
- **THEN** para el primer usuario "hoy" todavía es 2026-07-30, para el
  segundo ya es 2026-07-31, y la racha de cada uno se calcula respecto de
  su propio "hoy"

