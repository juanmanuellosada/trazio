## ADDED Requirements

### Requirement: El control de completar es una primitiva compartida

Todo control para completar una tarea o un hábito —en la grilla del calendario, en las listas, en el detalle de una tarea, en la pantalla de hábitos y en un enlace de lectura— SHALL construirse sobre una única primitiva compartida, y NUNCA SHALL reescribirse por pantalla.

La primitiva SHALL ofrecer dos tamaños: uno chico para los bloques apretados de la grilla del calendario, donde el bloque más corto no deja lugar para el tamaño normal, y uno normal para las listas y el detalle. Ambos tamaños SHALL exponer un área tocable de al menos 24×24 píxeles, aunque el círculo dibujado sea más chico.

El color del borde del control sin marcar SHALL ser una decisión explícita de quien lo usa y no un valor fijo de la primitiva: en la grilla del calendario toma el color del bloque, para que el control se lea como parte de él; en las listas usa el color de borde neutro de la interfaz. Marcado, SHALL verse igual en todas las superficies.

#### Scenario: El mismo control en el calendario y en la lista

- **WHEN** la misma tarea se ve en la grilla del calendario y en una lista
- **THEN** su control de completar SHALL ser el mismo componente en los dos
  lugares
- **AND** marcado SHALL verse igual en los dos

#### Scenario: El tamaño chico entra en un bloque apretado

- **WHEN** se muestra en la grilla un hábito de diez minutos, cuyo bloque no
  llega al alto de una línea de texto con su padding
- **THEN** su control de completar SHALL mostrarse igual, en el tamaño chico
- **AND** NUNCA SHALL desbordar el alto del bloque

#### Scenario: El área tocable no depende del tamaño dibujado

- **WHEN** se muestra el control en su tamaño chico
- **THEN** su área tocable SHALL medir al menos 24×24 píxeles

#### Scenario: El color sin marcar lo decide la superficie

- **WHEN** se compara el control sin marcar de una tarea en la grilla con el de
  la misma tarea en una lista
- **THEN** en la grilla SHALL tomar el color del bloque
- **AND** en la lista SHALL usar el color de borde neutro de la interfaz
