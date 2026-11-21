## ADDED Requirements

### Requirement: Una sola ocurrencia siguiente por completado

Completar una tarea recurrente NUNCA SHALL crear una ocurrencia siguiente si
ya existe una tarea pendiente de la misma serie para esa misma fecha. Se
considera de la misma serie a una tarea del mismo proyecto, con el mismo
padre, título y regla de recurrencia.

#### Scenario: Completar, descompletar y volver a completar no duplica

- **WHEN** se completa una tarea recurrente, se la vuelve a dejar pendiente y
  se la completa otra vez
- **THEN** existe una sola ocurrencia siguiente pendiente

#### Scenario: La ocurrencia siguiente ya completada no bloquea una nueva

- **WHEN** se completa una tarea recurrente cuya ocurrencia para la fecha
  siguiente existe pero ya está completada
- **THEN** se crea la ocurrencia siguiente

### Requirement: Ninguna ocurrencia posterior al fin de la serie

NUNCA SHALL crearse una ocurrencia cuya fecha sea posterior a
`recurrence_ends_at`, aunque esa fecha tope todavía no haya pasado al momento
de completar. El día elegido como fin de la serie SHALL quedar incluido.
Cuando la regla de recurrencia no tiene más fechas, NUNCA SHALL crearse una
ocurrencia.

#### Scenario: La ocurrencia siguiente caería después del fin de la serie

- **WHEN** se completa una tarea semanal cuya próxima fecha es posterior a su
  `recurrence_ends_at`, que todavía no pasó
- **THEN** no se crea ninguna instancia nueva

#### Scenario: La ocurrencia que cae el último día sí se crea

- **WHEN** se completa una tarea diaria cuya próxima fecha es el mismo día
  elegido como fin de la serie
- **THEN** se crea la ocurrencia de ese día

#### Scenario: Una regla agotada no genera una ocurrencia vencida

- **WHEN** se completa una tarea cuya regla de recurrencia ya no tiene fechas
  futuras
- **THEN** no se crea ninguna instancia nueva

### Requirement: Una falla al copiar las etiquetas no pierde la ocurrencia

La ocurrencia siguiente SHALL conservarse aunque sus etiquetas no se hayan
podido copiar, y la falla SHALL informarse a quien completó la tarea.

#### Scenario: Falla la copia de etiquetas

- **WHEN** se completa una tarea recurrente con etiquetas y la base rechaza la
  copia de esas etiquetas a la ocurrencia siguiente
- **THEN** la ocurrencia siguiente existe, sin etiquetas
- **AND** la interfaz muestra un aviso
