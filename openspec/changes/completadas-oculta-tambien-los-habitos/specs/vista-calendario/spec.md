## ADDED Requirements

### Requirement: Un bloque de hábito completado responde al control de completadas

En la forma de ver calendario, un hábito ya marcado ese día NUNCA SHALL dibujarse cuando el control de mostrar completadas está apagado, con el mismo criterio que una tarea completada.

Un hábito **salteado** SHALL seguir dibujándose, marcado como salteado, con el control apagado: la decisión de D50 —que un hábito salteado se ve y no desaparece de la grilla— NUNCA SHALL alterarse por este control.

#### Scenario: Un hábito completado desaparece de la grilla

- **WHEN** el control de mostrar completadas está apagado y un hábito de ese día ya está marcado
- **THEN** su bloque NUNCA SHALL dibujarse en la grilla

#### Scenario: Marcar un hábito con las completadas apagadas lo saca de la grilla

- **WHEN** con el control apagado se marca un hábito desde su bloque del calendario
- **THEN** ese bloque SHALL dejar de dibujarse

#### Scenario: Un hábito salteado sigue en la grilla

- **WHEN** el control de mostrar completadas está apagado y un hábito de ese día está salteado
- **THEN** su bloque SHALL seguir dibujándose, con su marca de salteado
