# pantalla-habitos Specification

## Purpose
TBD - created by archiving change fase-3-habitos. Update Purpose after archive.
## Requirements
### Requirement: Encabezado con tres números

La pantalla `/habitos` SHALL mostrar en su encabezado tres números: la cantidad de hábitos activos, la mejor racha alcanzada entre todos los hábitos del usuario (incluidos los archivados) y cuántos de los hábitos que tocan hoy ya se marcaron como hechos.

#### Scenario: El encabezado refleja los tres números

- **WHEN** el usuario tiene 5 hábitos activos, la mejor racha histórica
  entre todos sus hábitos es 20, y de los 4 hábitos que tocan hoy ya marcó
  3
- **THEN** el encabezado muestra 5 como hábitos activos, 20 como mejor
  racha alcanzada, y "3 de 4" como hábitos de hoy hechos

### Requirement: Agrupación por forma de repetirse

Los hábitos activos SHALL agruparse en la pantalla según su forma de repetirse, con un grupo para "todos los días", uno para "N veces por semana" y uno para "días específicos", cada grupo con su propio encabezado.

#### Scenario: Hábitos de distinta frecuencia aparecen en grupos separados

- **WHEN** el usuario tiene un hábito diario, uno de 3 veces por semana y
  uno de días específicos
- **THEN** la pantalla muestra tres grupos separados, cada uno con el
  hábito que le corresponde

### Requirement: Contenido de la tarjeta de un hábito

Cada tarjeta de hábito SHALL mostrar su nombre, su ícono, un casillero para marcarlo únicamente cuando el día de hoy corresponde a su frecuencia, su frecuencia junto con el horario y la duración estimada, un mini-mapa de los últimos 14 días, su racha actual o su progreso semanal según su tipo de frecuencia, y su mejor racha.

#### Scenario: Un hábito diario muestra racha actual

- **WHEN** se muestra la tarjeta de un hábito con frecuencia "todos los
  días"
- **THEN** la tarjeta muestra su racha actual en días, junto con nombre,
  ícono, horario, duración, mini-mapa de 14 días y mejor racha

#### Scenario: Un hábito de N veces por semana muestra progreso semanal en vez de racha de días

- **WHEN** se muestra la tarjeta de un hábito con `times_per_week = 3` que
  lleva 2 marcas en la semana en curso
- **THEN** la tarjeta muestra "2 de 3" como progreso semanal en lugar de
  una racha contada en días

#### Scenario: El casillero no aparece si el hábito no toca hoy

- **WHEN** un hábito de días específicos no tiene el día de hoy entre sus
  días configurados
- **THEN** su tarjeta no muestra casillero para marcar

### Requirement: El mini-mapa de 14 días es de solo lectura

El mini-mapa de los últimos 14 días de cada tarjeta MUST NOT permitir marcar ni desmarcar ningún día desde ahí; la única forma de marcar o desmarcar es el casillero del día de hoy.

#### Scenario: Hacer clic en un día pasado del mini-mapa no tiene efecto

- **WHEN** el usuario hace clic sobre un día marcado o sin marcar de hace
  una semana, dentro del mini-mapa de 14 días de un hábito
- **THEN** no ocurre ningún cambio de estado en ese día

### Requirement: Sección desplegable con los hábitos archivados

La pantalla `/habitos` SHALL mostrar una sección desplegable, colapsada por defecto, con los hábitos archivados del usuario.

#### Scenario: Expandir la sección de archivados los muestra

- **WHEN** el usuario tiene 2 hábitos archivados y expande la sección
  "Archivados"
- **THEN** se muestran esos 2 hábitos con su información histórica

### Requirement: La pantalla no ofrece selección múltiple

La pantalla `/habitos` MUST NOT ofrecer ningún modo de selección múltiple ni ninguna barra de acciones en lote sobre hábitos.

#### Scenario: No existe un modo de selección en la pantalla de hábitos

- **WHEN** el usuario está en `/habitos`
- **THEN** no hay ningún control para entrar en modo selección ni para
  seleccionar varios hábitos a la vez

### Requirement: Los hábitos no aparecen en el buscador ni en el lenguaje de filtros

Un hábito MUST NOT aparecer entre los resultados del buscador y MUST NOT poder referenciarse desde el lenguaje de consulta de filtros guardados.

#### Scenario: Buscar el nombre de un hábito no lo encuentra

- **WHEN** el usuario tiene un hábito llamado "Meditar" y busca "Meditar"
  en el buscador
- **THEN** el hábito no aparece entre los resultados, aunque una tarea con
  ese mismo texto en el título sí aparecería

### Requirement: Un hábito se puede saltear un día puntual

El usuario SHALL poder saltear un hábito en un día concreto, dejando constancia de que decidió no hacerlo ese día.

Un hábito salteado SHALL seguir mostrándose en el calendario de ese día, marcado como salteado, y NUNCA SHALL desaparecer: saltear es una decisión que queda a la vista, no una baja.

Saltear SHALL ser **reversible**: el usuario SHALL poder completar después ese mismo día, y al hacerlo la racha SHALL actualizarse como en cualquier otro día.

Saltear NUNCA SHALL modificar el cálculo de la racha por sí mismo. La racha SHALL seguir contando cumplimientos, de modo que saltear no suma ni resta: solo deja de estar pendiente.

Saltear SHALL afectar únicamente al día elegido, y NUNCA SHALL modificar la frecuencia del hábito ni su horario habitual.

#### Scenario: Saltear un hábito no lo cuenta como cumplido

- **WHEN** el usuario saltea un hábito en un día
- **THEN** ese día NUNCA SHALL contarse como cumplido
- **AND** el hábito SHALL seguir viéndose en el calendario de ese día, marcado como salteado

#### Scenario: Completar después de saltear actualiza la racha

- **WHEN** el usuario saltea un hábito y más tarde ese mismo día lo completa
- **THEN** SHALL quedar cumplido
- **AND** la racha SHALL actualizarse igual que en cualquier otro día

#### Scenario: Saltear no cambia la frecuencia

- **WHEN** el usuario saltea un hábito en un día
- **THEN** al día siguiente que le corresponda SHALL volver a aparecer normalmente

#### Scenario: Un día salteado se distingue de uno sin hacer

- **WHEN** el usuario mira el registro de un hábito con un día salteado y otro sin hacer
- **THEN** los dos días SHALL distinguirse entre sí

