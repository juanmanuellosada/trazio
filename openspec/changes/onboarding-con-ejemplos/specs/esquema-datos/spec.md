## ADDED Requirements

### Requirement: Marca de contenido de ejemplo en user_preferences

`user_preferences` SHALL tener una columna `seeded_at timestamptz` nullable que marca
que la cuenta ya recibió su contenido de ejemplo.

La migración que agrega la columna SHALL escribir, **en el mismo archivo**, `seeded_at`
con un valor no nulo para todas las filas existentes. Una cuenta anterior a esta
migración NUNCA SHALL quedar con `seeded_at` nulo: eso le sembraría contenido de ejemplo
encima de sus datos reales en su próxima entrada.

El trigger de aprovisionamiento de cuenta NUNCA SHALL crear contenido de ejemplo: sigue
creando únicamente perfil, preferencias y Bandeja de entrada.

#### Scenario: Las cuentas existentes quedan marcadas por la propia migración

- **WHEN** se aplica la migración que agrega `seeded_at` sobre una base con cuentas
  existentes
- **THEN** todas esas filas SHALL quedar con `seeded_at` no nulo

#### Scenario: Una cuenta nueva arranca sin marca

- **WHEN** se crea una cuenta nueva
- **THEN** su fila de `user_preferences` SHALL tener `seeded_at` nulo
- **AND** el trigger de aprovisionamiento NUNCA SHALL haber creado ningún proyecto de
  ejemplo
