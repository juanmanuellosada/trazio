## ADDED Requirements

### Requirement: Hora de fin del día en user_preferences

`user_preferences` SHALL tener una columna `day_end_time`, tipo `time`, `not
null`, con default `'22:00:00'`. Es una preferencia distinta de
`reference_time`: `reference_time` fija a qué hora se considera vencida una
tarea o hábito con día pero sin hora; `day_end_time` fija hasta qué hora se
considera que dura la jornada a los efectos del tiempo libre de Hoy
(capacidad `carga-del-dia`). Cambiar una NUNCA SHALL afectar a la otra.

#### Scenario: La columna existe con su default

- **WHEN** se inspecciona la definición de `user_preferences`
- **THEN** existe la columna `day_end_time`, tipo `time`, `not null`, con
  default `'22:00:00'`

#### Scenario: Una cuenta nueva recibe el default sin configurarlo

- **WHEN** se crea una cuenta nueva
- **THEN** su fila de `user_preferences` tiene `day_end_time` en
  `'22:00:00'` sin que la persona haya tocado Configuración
