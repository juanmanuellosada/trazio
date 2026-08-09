# habitos Specification

## Purpose
TBD - created by archiving change fase-3-habitos. Update Purpose after archive.
## Requirements
### Requirement: Campos de un hábito

Un hábito SHALL tener nombre, ícono emoji, color, duración estimada en minutos y hora programada opcional, donde la ausencia de hora programada SHALL interpretarse como "todo el día".

#### Scenario: Crear un hábito sin hora programada queda "todo el día"

- **WHEN** se crea el hábito "Leer" con ícono 📖, duración estimada de 20
  minutos y sin indicar hora programada
- **THEN** el hábito queda con `scheduled_time` nulo
- **AND** se muestra como "todo el día" en cualquier vista donde aparece

#### Scenario: Crear un hábito con hora programada

- **WHEN** se crea el hábito "Meditar" con ícono 🧘, duración estimada de 15
  minutos y hora programada `07:00`
- **THEN** el hábito queda con `scheduled_time` en `07:00`

### Requirement: El color de un hábito sigue la misma paleta y validación que proyectos

El color de un hábito SHALL restringirse a la misma paleta fija de diez colores con nombre que usan `projects` y `labels`, y SHALL admitir además un color personalizado que pase la misma validación de contraste AA contra el fondo de superficie de ambos temas que D29 exige para proyectos.

#### Scenario: Un color de la paleta fija se acepta

- **WHEN** se crea un hábito eligiendo uno de los diez colores con nombre de
  la paleta fija
- **THEN** el hábito se guarda con ese color sin ningún rechazo

#### Scenario: Un color personalizado sin contraste suficiente se rechaza

- **WHEN** se intenta guardar un hábito con un color personalizado que no
  alcanza el contraste mínimo AA contra el fondo de superficie del tema
  claro o del tema oscuro
- **THEN** la operación se rechaza, igual que ya ocurre hoy para un proyecto
  con un color personalizado sin contraste suficiente

### Requirement: Tres formas de repetirse, cada una con su configuración

Un hábito SHALL tener exactamente una forma de repetirse entre tres: "todos los días" sin configuración adicional, "N veces por semana" con `times_per_week` entre 1 y 7, o "días específicos" con `days_of_week` con al menos un día elegido.

#### Scenario: Todos los días no requiere configuración adicional

- **WHEN** se crea un hábito con frecuencia "todos los días"
- **THEN** el hábito se guarda con `frequency_type = 'daily'`, sin ningún
  valor en `times_per_week` ni en `days_of_week`

#### Scenario: N veces por semana exige un número entre 1 y 7

- **WHEN** se crea un hábito con frecuencia "N veces por semana" e indicando
  `times_per_week = 3`
- **THEN** el hábito se guarda con `frequency_type = 'times_per_week'` y
  `times_per_week = 3`
- **AND** intentar guardar `times_per_week` en `0` o en `8` se rechaza

#### Scenario: Días específicos exige al menos un día elegido

- **WHEN** se crea un hábito con frecuencia "días específicos" eligiendo
  lunes, miércoles y viernes
- **THEN** el hábito se guarda con `frequency_type = 'specific_days'` y
  `days_of_week` con esos tres días
- **AND** intentar guardar esta frecuencia sin ningún día elegido se rechaza

### Requirement: Un hábito no lleva atributos de tarea

Un hábito MUST NOT tener proyecto, sección, etiquetas, subtareas, prioridad ni comentarios propios. Un hábito SÍ SHALL poder tener recordatorios, con reglas propias distintas de las de una tarea (ver la capacidad `recordatorios-de-habitos`): siempre relativos a su hora, nunca puntuales.

#### Scenario: El formulario de un hábito no ofrece esos campos

- **WHEN** se abre el formulario de creación o edición de un hábito
- **THEN** no se ofrece ningún selector de proyecto, sección, etiquetas o
  prioridad, ni ninguna forma de agregar subtareas o comentarios
- **AND** SÍ se ofrece agregar y quitar recordatorios

### Requirement: Crear, editar y eliminar un hábito

Un hábito SHALL poder crearse y editarse indicando nombre, ícono, color, duración, hora programada opcional, forma de repetirse con su configuración y sus recordatorios; eliminar un hábito SHALL borrar junto con él, en cascada, todas sus marcas de `habit_completions`, todas sus reprogramaciones de `habit_schedule_overrides`, todos sus salteos de `habit_skips`, todos sus recordatorios de `habit_reminders` y todas sus entregas de `habit_reminder_deliveries`.

#### Scenario: Crear un hábito nuevo

- **WHEN** se completa el formulario de alta con nombre "Tomar agua", ícono
  💧, color, duración de 5 minutos y frecuencia "todos los días"
- **THEN** el hábito queda creado y visible en la pantalla de hábitos

#### Scenario: Editar la frecuencia de un hábito existente

- **WHEN** se edita un hábito que era "todos los días" y se cambia a "3
  veces por semana"
- **THEN** el hábito queda con `frequency_type = 'times_per_week'` y
  `times_per_week = 3`, y su racha se recalcula según la nueva frecuencia

#### Scenario: Eliminar un hábito con historial

- **WHEN** se elimina un hábito que tiene marcas en `habit_completions`, una
  reprogramación en `habit_schedule_overrides` y recordatorios en
  `habit_reminders` con entregas ya registradas
- **THEN** el hábito, sus marcas, su reprogramación, sus recordatorios y sus
  entregas se borran físicamente junto con él

### Requirement: Archivar conserva el historial intacto, y desarchivar lo devuelve completo

Archivar un hábito SHALL sacarlo de las vistas activas, del contador de Hoy y del badge sin borrar ninguna de sus marcas históricas, y desarchivarlo SHALL devolver ese historial completo e intacto.

#### Scenario: Archivar un hábito con marcas históricas

- **WHEN** se archiva un hábito que tiene 40 marcas en `habit_completions`
- **THEN** el hábito deja de aparecer en Hoy, en el contador de Hoy y en el
  badge, y sus 40 marcas permanecen sin borrarse

#### Scenario: Desarchivar devuelve el historial completo

- **WHEN** se desarchiva ese mismo hábito
- **THEN** vuelve a aparecer en las vistas activas y sus 40 marcas
  históricas siguen visibles en su mini-mapa e historial

### Requirement: Marcar y desmarcar hoy o un día pasado, desde el calendario

Un hábito SHALL poder marcarse y desmarcarse como hecho para el día de hoy o para cualquier día anterior, únicamente cuando ese día corresponde a su frecuencia configurada. Esta corrección SHALL estar disponible desde el calendario (`openspec/specs/vista-calendario/spec.md`, requirement "Cada bloque ofrece sus acciones desde el calendario"); el mini-mapa de los últimos 14 días (`/hábitos`) sigue siendo de solo lectura, sin ofrecer marcar ni desmarcar ningún día, ni siquiera hoy.

#### Scenario: Marcar el hábito de hoy

- **WHEN** se marca como hecho, desde el calendario, un hábito que toca hoy según su frecuencia
- **THEN** queda registrada una fila en `habit_completions` con
  `completed_on` igual a la fecha de hoy

#### Scenario: Desmarcar el hábito de hoy corrige un click de más

- **WHEN** se desmarca, desde el calendario, un hábito que ya estaba marcado como hecho hoy
- **THEN** la fila de `habit_completions` correspondiente al día de hoy se
  elimina

#### Scenario: Corregir un día pasado desde el calendario

- **WHEN** se marca o desmarca, desde el calendario, un día anterior a hoy en el que el hábito tocaba según su frecuencia
- **THEN** se crea o se elimina, según corresponda, la fila de
  `habit_completions` de esa fecha puntual, y la racha se recalcula al leer
  con esa corrección incluida (D10 — las rachas se calculan, no se guardan)

### Requirement: El futuro no se puede marcar ni corregir

Un día posterior a hoy MUST NOT poder marcarse ni desmarcarse, en ninguna pantalla.

#### Scenario: Intentar marcar un día futuro no tiene efecto

- **WHEN** se intenta marcar o desmarcar un hábito en una fecha posterior a
  la de hoy
- **THEN** la operación se rechaza sin crear ni eliminar ninguna fila en
  `habit_completions`

### Requirement: Un hábito no aparece en fechas anteriores a su creación

Un hábito MUST NOT aparecer en ninguna vista, ni ofrecer su casillero de marcado, para una fecha anterior a su `created_at`.

#### Scenario: Un hábito creado hoy no aparece en fechas anteriores

- **WHEN** se crea un hábito diario el 2026-07-31
- **THEN** el hábito no aparece en la vista Hoy ni en Próximos para el
  2026-07-30 ni ninguna fecha anterior

### Requirement: Reprogramación puntual del horario, sin mover el hábito de día

Un hábito SHALL poder reprogramar su hora para un día puntual, guardando ese cambio en `habit_schedule_overrides` sin modificar `habits.scheduled_time`, y ese override MUST NOT mover el hábito a un día distinto del que le corresponde por su frecuencia habitual.

#### Scenario: Reprogramar la hora de un día puntual no toca el horario habitual

- **WHEN** un hábito con `scheduled_time = '07:00'` se reprograma a `19:00`
  únicamente para el día 2026-08-03
- **THEN** se crea una fila en `habit_schedule_overrides` con `date =
  '2026-08-03'` y `scheduled_time = '19:00'`
- **AND** `habits.scheduled_time` sigue en `07:00` para cualquier otro día

#### Scenario: El override no mueve el hábito de día

- **WHEN** se intenta usar la reprogramación puntual para asignarle a un
  hábito una fecha en la que su frecuencia no le correspondería tocar
- **THEN** la reprogramación se rechaza: el mecanismo solo cambia el
  horario dentro de un día que ya le toca al hábito, nunca lo hace aparecer
  en un día distinto

### Requirement: Ctrl/Cmd+Z no cubre hábitos

El deshacer global de `Ctrl/Cmd+Z` que define la capacidad `deshacer` MUST NOT aplicarse a ninguna operación sobre hábitos.

#### Scenario: Deshacer después de marcar un hábito no tiene efecto

- **WHEN** se marca un hábito como hecho hoy y a continuación se presiona
  `Ctrl/Cmd+Z`
- **THEN** el hábito sigue marcado como hecho: el atajo no revierte la
  operación, porque desmarcarlo manualmente ya es la forma de corregirla

