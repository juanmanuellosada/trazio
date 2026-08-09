## MODIFIED Requirements

### Requirement: Mostrar u ocultar tareas completadas

La barra SHALL ofrecer un control para mostrar u ocultar lo ya completado de la pantalla actual. El control SHALL cubrir tanto las tareas completadas como los **hábitos ya marcados** ese día: el criterio es el estado, no el tipo de elemento.

Un hábito **salteado** NUNCA SHALL ocultarse por este control: saltear no es completar, y un salteo es una pendiente que se decidió no hacer, no algo hecho.

Este control y el de mostrar hábitos SHALL seguir siendo independientes: apagar hábitos los saca a todos, apagar completadas saca únicamente los ya marcados.

#### Scenario: Ocultar completadas las saca de la vista

- **WHEN** el usuario desactiva "mostrar completadas" en la Bandeja de
  entrada
- **THEN** las tareas completadas dejan de listarse ahí
- **AND** al reactivar la opción, vuelven a aparecer

#### Scenario: Ocultar completadas también saca los hábitos ya marcados

- **WHEN** el usuario desactiva "mostrar completadas" en una pantalla que muestra hábitos
- **THEN** los hábitos ya marcados ese día dejan de mostrarse
- **AND** al reactivar la opción, vuelven a aparecer

#### Scenario: Un hábito salteado sigue visible con las completadas apagadas

- **WHEN** el usuario desactiva "mostrar completadas" y ese día hay un hábito salteado
- **THEN** ese hábito SHALL seguir mostrándose, marcado como salteado

#### Scenario: Los dos controles siguen siendo independientes

- **WHEN** el usuario desactiva "mostrar completadas" y deja "mostrar hábitos" activo
- **THEN** los hábitos pendientes SHALL seguir mostrándose
- **AND** solo los ya marcados dejan de verse
