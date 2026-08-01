## MODIFIED Requirements

### Requirement: La barra de opciones de vista está presente en seis pantallas

La barra de opciones de vista SHALL presentarse en Bandeja de entrada, Hoy, Próximos, Proyecto, la página de una Etiqueta y la página de un Filtro como un único disparador en la cabecera que abre un panel agrupado en las secciones Vista (forma de ver, el formato de calendario cuando corresponde, y los interruptores de completadas y de hábitos), Orden (agrupar por, ordenar por) y Filtro (fecha límite, prioridad, etiqueta), con el botón de restablecer al pie del panel.

#### Scenario: El disparador aparece en las seis pantallas

- **WHEN** el usuario abre, una por una, la Bandeja de entrada, Hoy,
  Próximos, un Proyecto, la página de una Etiqueta y la página de un
  Filtro
- **THEN** cada una de esas seis pantallas muestra el disparador de
  opciones de vista

#### Scenario: El disparador abre un panel agrupado en tres secciones

- **WHEN** el usuario abre el disparador de opciones de vista
- **THEN** ve un panel con las secciones Vista, Orden y Filtro
- **AND** el selector de forma de ver está dentro de la sección Vista, no
  suelto en la cabecera

## ADDED Requirements

### Requirement: El disparador indica cuándo hay opciones activas distintas de las por defecto

El disparador de opciones de vista SHALL mostrar una indicación visual cuando al menos una de sus opciones —orden, agrupación, un filtro rápido, o los interruptores de completadas o de hábitos— tiene un valor distinto del valor por defecto de esa pantalla, y MUST NOT mostrar esa indicación cuando todas las opciones están en su valor por defecto.

#### Scenario: El disparador se marca cuando hay un filtro activo

- **WHEN** el usuario filtra por prioridad "Urgente" en la Bandeja de
  entrada y cierra el panel de opciones de vista
- **THEN** el disparador de opciones de vista muestra una indicación de que
  hay opciones activas

#### Scenario: El disparador no se marca con los valores por defecto

- **WHEN** el usuario abre una pantalla sin haber cambiado ninguna de sus
  opciones de vista
- **THEN** el disparador de opciones de vista no muestra ninguna
  indicación

#### Scenario: Restablecer quita la indicación

- **WHEN** el usuario presiona "restablecer" con al menos una opción
  distinta de su valor por defecto
- **THEN** el disparador de opciones de vista deja de mostrar la
  indicación
