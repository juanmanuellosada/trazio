## MODIFIED Requirements

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
